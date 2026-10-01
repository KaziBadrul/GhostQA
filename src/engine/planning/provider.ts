import { explorationOperations } from '../policy/operations';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import {
  ApiModelSchema,
  FrozenScopeSchema,
  type ApiModel,
  type FrozenScope,
  type Journey,
} from '../contracts';
import { unpackProposal } from '../mapping/state';
import { validateJourney } from '../validation/journey';
import { SecretVault } from '../secrets/vault';
import { sanitizeDocument } from '../openapi/sanitize';
import {
  boundedContext,
  sanitizeContext,
  type SanitizedPlanningContext,
} from './context';
// Fixed semantic codes only; exception messages and model-supplied values are
// never diagnostic payloads. Unknown validation failures retain their boundary.
const ValidationRuleSchema = z.enum([
  'REPLY SCHEMA',
  'OUTPUT SIZE',
  'PROPOSAL SCHEMA',
  'JOURNEY VALIDATION',
  'PROVIDER IDENTITY',
  'MAPPING OPERATIONS',
  'PREDICATE REFERENCE',
  'PREDICATE STEP',
  'STEP LIMIT',
  'SANITIZATION',
  'UNKNOWN OPERATION',
  'DUPLICATE PARAMETER',
  'UNKNOWN PARAMETER',
  'INVALID PARAMETER NAME',
  'INVALID PARAMETER',
  'MISSING PARAMETER',
  'MISSING BODY',
  'UNDECLARED BODY',
  'INVALID BODY',
  'INVALID BODY POINTER',
  'INVALID DEPENDENCY',
  'DUPLICATE VARIABLE',
  'DUPLICATE STEP',
  'INVALID EXTRACTION',
  'PREDICATE HASH MISMATCH',
]);
export const ProviderDiagnosticSchema = z.strictObject({
  stage: z.enum(['REQUEST', 'RESPONSE_PARSE', 'CONTRACT_VALIDATION']),
  validationRule: ValidationRuleSchema.optional(),
  model: z.string().regex(/^(?:models\/)?[A-Za-z0-9._-]+$/),
  contractIssues: z
    .array(
      z.strictObject({
        code: z.enum([
          'invalid_type',
          'invalid_value',
          'invalid_format',
          'too_big',
          'too_small',
          'unrecognized_keys',
          'not_multiple_of',
          'invalid_union',
          'invalid_key',
          'invalid_element',
          'custom',
        ]),
        path: z
          .array(
            z.union([
              z.int().nonnegative(),
              z.enum([
                'journey',
                'mappings',
                'hypotheses',
                'id',
                'steps',
                'operationId',
                'parameters',
                'location',
                'name',
                'value',
                'kind',
                'stepId',
                'pointer',
                'body',
                'bodyBindings',
                'extracts',
                'expectedType',
                'source',
                'key',
                'generator',
                'constraints',
                'sensitive',
                'expectedStatuses',
                'variables',
                'predicateRef',
                'version',
                'hash',
                'rationale',
                'dependencies',
                'producer',
                'consumer',
                'variable',
                'statement',
                'operationIds',
                'evidenceIds',
                'canonicalHash',
                'sourceRef',
                'approvalRef',
                'applicability',
                'op',
                'left',
                'right',
                'assertions',
                '[FIELD]',
              ]),
            ]),
          )
          .max(20),
      }),
    )
    .max(10)
    .optional(),
  httpStatus: z.int().min(100).max(599).optional(),
  apiStatus: z
    .enum([
      'INVALID_ARGUMENT',
      'RESOURCE_EXHAUSTED',
      'NOT_FOUND',
      'UNAUTHENTICATED',
      'PERMISSION_DENIED',
      'UNAVAILABLE',
      'INTERNAL',
      'UNKNOWN',
    ])
    .optional(),
});
export type ProviderDiagnostic = z.infer<typeof ProviderDiagnosticSchema>;
function validationDiagnostic(
  error: unknown,
  model: string,
  boundary: z.infer<typeof ValidationRuleSchema>,
): ProviderDiagnostic | undefined {
  const known = ValidationRuleSchema.safeParse(
    error instanceof Error ? error.message : undefined,
  );
  const issueSchema =
    ProviderDiagnosticSchema.shape.contractIssues.unwrap().element;
  const issues =
    error instanceof z.ZodError
      ? error.issues.slice(0, 10).flatMap((issue) => {
          const safe = issueSchema.safeParse({
            code: issue.code,
            path: issue.path
              .slice(0, 20)
              .map((part) =>
                issueSchema.shape.path.element.safeParse(part).success
                  ? part
                  : '[FIELD]',
              ),
          });
          return safe.success ? [safe.data] : [];
        })
      : known.success && known.data === 'PREDICATE HASH MISMATCH'
        ? [{ code: 'custom' as const, path: ['hypotheses', 'canonicalHash'] }]
        : [];
  const safe = ProviderDiagnosticSchema.safeParse({
    stage: 'CONTRACT_VALIDATION',
    model,
    validationRule: known.success ? known.data : boundary,
    ...(issues.length ? { contractIssues: issues } : {}),
  });
  return safe.success ? safe.data : undefined;
}
export class ProviderRequestError extends Error {
  constructor(readonly diagnostic: ProviderDiagnostic) {
    super('MODEL ERROR');
  }
}
export class ProviderOutputError extends Error {
  constructor(readonly diagnostic?: ProviderDiagnostic) {
    super('MODEL PLAN ERROR');
  }
}
export interface ReasoningProvider {
  readonly identity?: { provider: string; model: string };
  propose(
    input: SanitizedPlanningContext,
    signal: AbortSignal,
  ): Promise<ProviderReply>;
}
const UsageSchema = z.strictObject({
  inputTokens: z.int().nonnegative().optional(),
  outputTokens: z.int().nonnegative().optional(),
  estimated: z.boolean(),
});
const ReplySchema = z.strictObject({
  proposal: z.unknown(),
  provider: z.string().min(1),
  model: z.string().min(1),
  usage: UsageSchema,
});
export type ProviderReply = z.infer<typeof ReplySchema>;
export const ProposalFailureKindSchema = z.enum([
  'MODEL_CONFIGURATION',
  'INVALID_TIMEOUT',
  'TIMEOUT',
  'CANCELLED',
  'PROVIDER_REQUEST',
  'PROVIDER_OUTPUT',
  'PROVIDER_EXCEPTION',
  'CONTRACT_VALIDATION',
]);
export interface ProposalTelemetry {
  provider: string;
  model: string;
  attempted: boolean;
  usage: ProviderReply['usage'];
  outcome: 'PROPOSED' | 'MODEL ERROR' | 'MODEL PLAN ERROR' | 'CANCELLED';
  diagnostic?: ProviderDiagnostic;
  failureKind?: z.infer<typeof ProposalFailureKindSchema>;
  elapsedMs?: number;
  timeoutMs?: number;
}
export class PlanningError extends Error {
  constructor(
    reason: ProposalTelemetry['outcome'],
    readonly telemetry: ProposalTelemetry,
  ) {
    super(reason);
  }
}
export interface RequestInput {
  provider: ReasoningProvider;
  context: SanitizedPlanningContext;
  api: ApiModel;
  scope: FrozenScope;
  model: string;
  signal: AbortSignal;
  timeoutMs: number;
  remainingMilliseconds: number;
}
export async function requestProposal(
  input: RequestInput,
): Promise<ProviderReply> {
  let attempted = false;
  let identity = input.provider.identity?.provider ?? 'unavailable';
  let usage: ProviderReply['usage'] = { estimated: true };
  let diagnostic: ProviderDiagnostic | undefined;
  const telemetryTiming: { started?: number; timeout?: number } = {};
  const fail = (
    reason: ProposalTelemetry['outcome'],
    failureKind: z.infer<typeof ProposalFailureKindSchema> = reason ===
    'CANCELLED'
      ? 'CANCELLED'
      : 'CONTRACT_VALIDATION',
  ): never => {
    throw new PlanningError(reason, {
      provider: identity,
      model: input.model,
      attempted,
      usage,
      outcome: reason,
      failureKind,
      ...(telemetryTiming.started === undefined
        ? {}
        : {
            elapsedMs: Math.max(
              0,
              Math.round(performance.now() - telemetryTiming.started),
            ),
          }),
      ...(telemetryTiming.timeout === undefined
        ? {}
        : { timeoutMs: telemetryTiming.timeout }),
      ...(diagnostic ? { diagnostic } : {}),
    });
  };
  if (input.signal.aborted) fail('CANCELLED');
  if (
    !input.model.trim() ||
    (input.provider.identity && input.provider.identity.model !== input.model)
  )
    fail('MODEL ERROR', 'MODEL_CONFIGURATION');
  const timeout = Math.min(30000, input.timeoutMs, input.remainingMilliseconds);
  if (!Number.isFinite(timeout) || timeout <= 0)
    fail('MODEL ERROR', 'INVALID_TIMEOUT');
  telemetryTiming.timeout = timeout;
  const started = performance.now();
  telemetryTiming.started = started;
  const vault = new SecretVault();
  let context: SanitizedPlanningContext;
  try {
    context = sanitizeContext(boundedContext(input.context), vault);
  } catch {
    vault.discard();
    fail('MODEL PLAN ERROR');
  }
  usage = {
    inputTokens: Math.ceil(Buffer.byteLength(JSON.stringify(context!)) / 4),
    estimated: true,
  };
  // Separate immutable validation snapshots from the provider's input object.
  const api = ApiModelSchema.parse(input.api);
  const scope = FrozenScopeSchema.parse(input.scope);
  const controller = new AbortController();
  let rejectStop!: (error: Error) => void;
  const interrupted = new Promise<never>((_, reject) => {
    rejectStop = reject;
  });
  let stopped: 'CANCELLED' | 'MODEL ERROR' | undefined;
  const stop = (reason: 'CANCELLED' | 'MODEL ERROR') => {
    stopped ??= reason;
    controller.abort();
    rejectStop(new Error(reason));
  };
  const cancel = () => stop('CANCELLED');
  input.signal.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(
    () => stop('MODEL ERROR'),
    Math.max(1, timeout - (performance.now() - started)),
  );
  try {
    if (input.signal.aborted) fail('CANCELLED');
    if (performance.now() - started >= timeout) fail('MODEL ERROR', 'TIMEOUT');
    attempted = true;
    let raw: ProviderReply;
    try {
      raw = await Promise.race([
        input.provider.propose(structuredClone(context!), controller.signal),
        interrupted,
      ]);
    } catch (error) {
      if (
        error instanceof ProviderRequestError ||
        error instanceof ProviderOutputError
      ) {
        const safe = ProviderDiagnosticSchema.safeParse(error.diagnostic);
        if (safe.success && safe.data.model === input.model)
          diagnostic = safe.data;
      }
      fail(
        stopped ??
          (input.signal.aborted
            ? 'CANCELLED'
            : error instanceof ProviderOutputError
              ? 'MODEL PLAN ERROR'
              : 'MODEL ERROR'),
        stopped === 'MODEL ERROR'
          ? 'TIMEOUT'
          : stopped === 'CANCELLED' || input.signal.aborted
            ? 'CANCELLED'
            : error instanceof ProviderRequestError
              ? 'PROVIDER_REQUEST'
              : error instanceof ProviderOutputError
                ? 'PROVIDER_OUTPUT'
                : 'PROVIDER_EXCEPTION',
      );
    }
    if (input.signal.aborted || stopped === 'CANCELLED') fail('CANCELLED');
    if (stopped || performance.now() - started >= timeout)
      fail('MODEL ERROR', 'TIMEOUT');
    let reply: ProviderReply;
    let journey: Journey;
    let validationBoundary: z.infer<typeof ValidationRuleSchema> =
      'REPLY SCHEMA';
    const reject = (rule: z.infer<typeof ValidationRuleSchema>): never => {
      diagnostic = validationDiagnostic(undefined, input.model, rule);
      return fail('MODEL PLAN ERROR');
    };
    try {
      reply = ReplySchema.parse(raw!);
      identity = reply.provider;
      usage =
        reply.usage.inputTokens === undefined ||
        reply.usage.outputTokens === undefined
          ? {
              inputTokens: reply.usage.inputTokens ?? usage.inputTokens,
              outputTokens:
                reply.usage.outputTokens ??
                Math.ceil(
                  Buffer.byteLength(JSON.stringify(reply.proposal)) / 4,
                ),
              estimated: true,
            }
          : reply.usage;
      if (
        reply.model !== input.model ||
        (input.provider.identity &&
          reply.provider !== input.provider.identity.provider)
      )
        reject('PROVIDER IDENTITY');
      if (Buffer.byteLength(JSON.stringify(reply.proposal)) > 64 * 1024)
        reject('OUTPUT SIZE');
      validationBoundary = 'PROPOSAL SCHEMA';
      const proposed = unpackProposal(reply.proposal);
      validationBoundary = 'JOURNEY VALIDATION';
      journey = validateJourney(proposed.journey, api, scope, 'EXPLORATION');
      const allowedMappings = new Set(
        explorationOperations(api, scope).map((o) => o.id),
      );
      for (const mapping of proposed.mappings)
        if (
          !mapping.operationIds.length ||
          mapping.operationIds.some((id) => !allowedMappings.has(id))
        )
          reject('MAPPING OPERATIONS');
      const ref = journey.predicateRef;
      if (
        !context!.approvedPredicateRefs.some(
          (p) =>
            p.id === ref.id && p.version === ref.version && p.hash === ref.hash,
        )
      )
        reject('PREDICATE REFERENCE');
      const definition = context!.predicateDefinitions.find(
        (p) =>
          p.id === ref.id &&
          p.version === ref.version &&
          p.canonicalHash === ref.hash,
      );
      if (definition) {
        const stepIds = new Set(journey.steps.map((s) => s.id));
        for (const comparison of [
          ...definition.applicability,
          ...definition.assertions,
        ])
          for (const operand of [comparison.left, comparison.right])
            if (operand && 'stepId' in operand && !stepIds.has(operand.stepId))
              reject('PREDICATE STEP');
      }
      const limits = context!.remainingLimits;
      if (
        limits &&
        typeof limits === 'object' &&
        !Array.isArray(limits) &&
        typeof limits.steps === 'number' &&
        journey.steps.length > limits.steps
      )
        reject('STEP LIMIT');
      if (
        JSON.stringify(
          sanitizeDocument(
            journey as unknown as import('../contracts').Json,
            vault,
            true,
          ),
        ) !== JSON.stringify(journey)
      )
        reject('SANITIZATION');
    } catch (error) {
      if (!(error instanceof PlanningError))
        diagnostic = validationDiagnostic(
          error,
          input.model,
          validationBoundary,
        );
      fail('MODEL PLAN ERROR');
    }
    if (input.signal.aborted) fail('CANCELLED');
    if (performance.now() - started >= timeout) fail('MODEL ERROR', 'TIMEOUT');
    return { ...reply!, proposal: reply!.proposal, usage };
  } finally {
    clearTimeout(timer);
    input.signal.removeEventListener('abort', cancel);
    vault.discard();
  }
}
