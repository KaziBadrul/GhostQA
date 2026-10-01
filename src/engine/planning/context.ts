import { z } from 'zod';
import {
  ApiModelSchema,
  ObservationSchema,
  StateMappingSchema,
  JsonSchema,
  PredicateRefSchema,
  PredicateSchema,
  Hash,
  type Json,
  type Run,
} from '../contracts';
import { SecretVault } from '../secrets/vault';
import { explorationOperations } from '../policy/operations';
import { sanitizeDocument } from '../openapi/sanitize';
export const PlanningContextSchema = z.strictObject({
  api: ApiModelSchema,
  mappings: z.array(StateMappingSchema),
  observations: z.array(ObservationSchema),
  approvedPredicateRefs: z.array(PredicateRefSchema),
  predicateDefinitions: z.array(PredicateSchema).max(100).default([]),
  symbolicInputs: JsonSchema,
  remainingLimits: JsonSchema,
  consideredHypothesisHashes: z.array(Hash),
});
export type SanitizedPlanningContext = z.infer<typeof PlanningContextSchema>;
export interface ContextInput {
  run: Run;
  mappings: SanitizedPlanningContext['mappings'];
  observations: SanitizedPlanningContext['observations'];
  symbolicInputs: Json;
  consideredHypothesisHashes: string[];
}
export function boundedContext(value: unknown): SanitizedPlanningContext {
  if (Buffer.byteLength(JSON.stringify(value)) > 128 * 1024)
    throw new Error('MODEL PLAN ERROR');
  return PlanningContextSchema.parse(value);
}
export function sanitizeContext(
  context: SanitizedPlanningContext,
  vault: SecretVault,
): SanitizedPlanningContext {
  // Schema names are structural, not response fields. Discover data secrets first
  // so unexpected echoes in descriptions are redacted by the same vault.
  const data = vault.sanitize(
    {
      predicateDefinitions: context.predicateDefinitions,
      mappings: context.mappings,
      observations: context.observations,
      symbolicInputs: context.symbolicInputs,
    } as Json,
    true,
  ) as Record<string, Json>;
  const api = sanitizeDocument(context.api as unknown as Json, vault, true);
  return boundedContext({
    ...context,
    api,
    ...(vault.sanitize(data, true) as Record<string, Json>),
  });
}
export function buildPlanningContext(
  input: ContextInput,
  vault: SecretVault,
): SanitizedPlanningContext {
  const operations = explorationOperations(
    input.run.apiSnapshot,
    input.run.scope,
  );
  const eligible = new Set(operations.map((o) => o.id));
  const mappings = input.mappings.filter(
    (m) =>
      m.operationIds.length > 0 &&
      m.operationIds.every((id) => eligible.has(id)),
  );
  const observations = input.observations
    .filter(
      (o) =>
        o.runId === input.run.id &&
        (!o.result.sanitizedRequest ||
          typeof o.result.sanitizedRequest !== 'object' ||
          Array.isArray(o.result.sanitizedRequest) ||
          !('operationId' in o.result.sanitizedRequest) ||
          eligible.has(String(o.result.sanitizedRequest.operationId))),
    )
    .map((o) => ({
      ...o,
      stateMappings: o.stateMappings.filter((m) =>
        m.operationIds.every((id) => eligible.has(id)),
      ),
    }));
  const predicates = input.run.predicates.filter(
    (p) => p.source !== 'AGENT_HYPOTHESIS' || p.approvalRef !== undefined,
  );
  return sanitizeContext(
    {
      api: {
        snapshotId: input.run.apiSnapshot.snapshotId,
        contentHash: input.run.apiSnapshot.contentHash,
        openapiVersion: input.run.apiSnapshot.openapiVersion,
        operations,
        importDiagnostics: [],
      },
      mappings,
      observations,
      predicateDefinitions: predicates,
      approvedPredicateRefs: predicates.map((p) => ({
        id: p.id,
        version: p.version,
        hash: p.canonicalHash,
      })),
      symbolicInputs: input.symbolicInputs,
      remainingLimits: {
        requests: Math.max(
          0,
          input.run.budget.limits.requests - input.run.budget.usedRequests,
        ),
        steps: input.run.budget.limits.steps,
        journeys: Math.max(
          0,
          input.run.budget.limits.journeys -
            input.run.budget.usedExplorationJourneys,
        ),
      },
      consideredHypothesisHashes: input.consideredHypothesisHashes,
    },
    vault,
  );
}
