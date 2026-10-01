import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  JourneySchema,
  PredicateSchema,
  StateMappingSchema,
  type ApiModel,
  type Journey,
  type Observation,
  type StateMapping,
} from '../contracts';
import { canonical } from '../detection/predicate';
import { validatePredicate } from '../validation/predicate';
export const ProposalSchema = z.strictObject({
  journey: JourneySchema,
  mappings: z.array(StateMappingSchema).max(100),
  hypotheses: z.array(PredicateSchema).max(20),
});
function normalizeProposal(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const value = raw as Record<string, unknown>;
  const journey =
    'journey' in value && value.journey && typeof value.journey === 'object'
      ? (value.journey as Record<string, unknown>)
      : value;
  if (journey && typeof journey === 'object') {
    if (!z.uuid().safeParse(journey.id).success) journey.id = randomUUID();
    const steps = Array.isArray(journey.steps) ? (journey.steps as Array<Record<string, unknown>>) : [];
    for (const step of steps) {
      if (step && typeof step === 'object') {
        const bindings = Array.isArray(step.bodyBindings) ? step.bodyBindings : [];
        if (bindings.length > 0) {
          step.body =
            step.body && typeof step.body === 'object' && !Array.isArray(step.body)
              ? step.body
              : {};
          const bodyObj = step.body as Record<string, unknown>;
          for (const b of bindings) {
            if (b && typeof b === 'object' && typeof b.pointer === 'string' && b.pointer.startsWith('/')) {
              const key = b.pointer.slice(1).split('/')[0];
              if (key && !(key in bodyObj)) bodyObj[key] = null;
            }
          }
        }
      }
    }
    if (Array.isArray(journey.variables)) {
      const extractedNames = new Set(
        steps.flatMap((s) => (Array.isArray(s.extracts) ? s.extracts.map((e: any) => e?.name) : []))
      );
      journey.variables = (journey.variables as Array<Record<string, unknown>>).filter((v) => {
        const kind = v?.source && typeof v.source === 'object' && 'kind' in v.source ? (v.source as any).kind : undefined;
        if (kind === 'input' || kind === 'generate') return true;
        return typeof v?.name === 'string' && !extractedNames.has(v.name);
      });
    }
  }
  if (Array.isArray(value.mappings)) {
    for (const m of value.mappings as Array<Record<string, unknown>>) {
      if (m && typeof m === 'object' && !z.uuid().safeParse(m.id).success) {
        m.id = randomUUID();
      }
    }
  }
  return value;
}
export function unpackProposal(input: unknown) {
  const value = normalizeProposal(input);
  if (value && typeof value === 'object' && 'journey' in value) {
    const proposal = ProposalSchema.parse(value);
    for (const mapping of proposal.mappings)
      if (!['INFERRED_DEPENDENCY', 'HYPOTHESIZED_STATE'].includes(mapping.kind))
        throw new Error('MODEL PLAN ERROR');
    for (const predicate of proposal.hypotheses)
      if (
        validatePredicate(predicate).source !== 'AGENT_HYPOTHESIS' ||
        predicate.approvalRef !== undefined
      )
        throw new Error('MODEL PLAN ERROR');
    return proposal;
  }
  return { journey: JourneySchema.parse(value), mappings: [], hypotheses: [] };
}
export function declaredMappings(api: ApiModel): StateMapping[] {
  return api.operations
    .filter((o) => o.eligible)
    .map((o) => ({
      id: randomUUID(),
      kind: 'DECLARED',
      statement: `${o.method} ${o.pathTemplate} is declared by the imported specification`,
      operationIds: [o.id],
      evidenceIds: [],
    }));
}
export function inferredMappings(journey: Journey): StateMapping[] {
  return journey.dependencies.map((d) => ({
    id: randomUUID(),
    kind: 'INFERRED_DEPENDENCY',
    statement: `${d.variable} flows from ${d.producer} to ${d.consumer}`,
    rationale:
      'Explicit proposed producer/consumer binding; not an observed guarantee',
    operationIds: [
      journey.steps.find((s) => s.id === d.producer)!.operationId,
      journey.steps.find((s) => s.id === d.consumer)!.operationId,
    ],
    evidenceIds: [],
  }));
}
export function observedMappings(
  journey: Journey,
  observations: Observation[],
): StateMapping[] {
  return observations
    .filter(
      (o) =>
        o.result.outcome === 'RESPONSE' &&
        journey.steps.some((s) => s.id === o.stepId),
    )
    .map((o) => ({
      id: randomUUID(),
      kind: 'OBSERVED_TRANSITION',
      statement: `Step ${o.stepId} completed with HTTP ${o.result.status}; this records a response, not an inferred business-state guarantee`,
      operationIds: [journey.steps.find((s) => s.id === o.stepId)!.operationId],
      evidenceIds: [o.id],
    }));
}
// IDs, rationale and fresh literal contents are cosmetic. Ordered operations,
// binding sources/destinations and predicate identity remain in the fingerprint.
export function hypothesisHash(journey: Journey): string {
  const steps = new Map(journey.steps.map((s, i) => [s.id, i]));
  const variables = new Map(
    [...journey.variables, ...journey.steps.flatMap((s) => s.extracts)].map(
      (v, i) => [v.name, i],
    ),
  );
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    if (record.kind === 'literal')
      return {
        kind: 'literal',
        type: Array.isArray(record.value)
          ? 'array'
          : record.value === null
            ? 'null'
            : typeof record.value,
      };
    return Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => !['rationale', 'expectedStatuses'].includes(key))
        .map(([key, child]) => [
          key,
          ['stepId', 'producer', 'consumer'].includes(key) &&
          typeof child === 'string'
            ? steps.get(child)
            : (key === 'variable' ||
                  (key === 'name' &&
                    ('expectedType' in record ||
                      record.kind === 'variable'))) &&
                typeof child === 'string' &&
                variables.has(child)
              ? variables.get(child)
              : normalize(child),
        ]),
    );
  };
  const bodyShape = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(bodyShape);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, bodyShape(child)]),
      );
    return value === null ? 'null' : typeof value;
  };
  const definition = {
    operations: journey.steps.map((s) => ({
      operationId: s.operationId,
      parameters: s.parameters,
      body: s.body === undefined ? undefined : bodyShape(s.body),
      bodyBindings: s.bodyBindings,
      extracts: s.extracts,
    })),
    variables: journey.variables,
    dependencies: journey.dependencies,
    predicate: journey.predicateRef,
  };
  return createHash('sha256')
    .update(canonical(normalize(definition)))
    .digest('hex');
}
