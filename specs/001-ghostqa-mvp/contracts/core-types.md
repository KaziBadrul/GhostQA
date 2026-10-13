# Core TypeScript and runtime contracts

Design contracts only; no application code is implemented. Implement strict Zod schemas as the
source of inferred TypeScript types, JSON Schema for the provider's supported subset, and
runtime checks at every boundary. Unknown fields are rejected. IDs are UUIDs except stable
operation IDs (`method + canonical path`) and named step IDs. All collections obey spec bounds.

```typescript
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type PredicateOutcome = 'SATISFIED' | 'VIOLATED' | 'NOT APPLICABLE' | 'UNEVALUABLE';
type Phase = 'RESET' | 'BASELINE' | 'EXPLORATION' | 'REPLAY' | 'MINIMIZATION' | 'ARTIFACT';
type Operand =
  | { kind: 'literal'; value: Json }
  | { kind: 'variable'; name: string }
  | { kind: 'status'; stepId: string }
  | { kind: 'json'; stepId: string; pointer: string }
  | { kind: 'header'; stepId: string; name: string };
interface Comparison {
  op: 'equals' | 'not-equals' | 'in' | 'exists' | 'absent';
  left: Operand; right?: Operand; // `in` requires a literal array; existence forbids right
}
interface ApiParameter {
  name: string; in: 'path' | 'query' | 'header'; required: boolean;
  schema: Json; style: 'simple' | 'form'; explode: boolean; sensitive: boolean;
}
interface ApiOperation {
  id: string; method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'HEAD'|'OPTIONS';
  pathTemplate: string; parameters: ApiParameter[]; requestBody?: Json;
  requestBodyRequired?: boolean; // retained for Feature 002; historical snapshots may omit
  responses: Json; eligible: boolean; exclusionReasons: string[];
  sanitizedDescription?: string;
}
interface ApiModel {
  snapshotId: string; contentHash: string; openapiVersion: string;
  operations: ApiOperation[]; importDiagnostics: Json[];
}
interface StateVariable {
  name: string; expectedType: 'string'|'integer'|'number'|'boolean'|'object'|'array'|'null';
  source: Operand | { kind: 'input'; key: string } |
    { kind: 'generate'; generator: 'email'|'uuid'|'bounded-literal'; constraints: Json };
  sensitive: boolean; // immutable declaration; runtime taint can promote, never downgrade
}
interface StateMapping {
  kind: 'DECLARED'|'INFERRED_DEPENDENCY'|'HYPOTHESIZED_STATE'|'OBSERVED_TRANSITION';
  id: string; statement: string; operationIds: string[]; rationale?: string;
  evidenceIds: string[]; // observed transitions require evidence
}
interface Predicate {
  id: string; version: number; canonicalHash: string;
  source: 'SPEC_ASSERTION'|'DEVELOPER'|'AGENT_HYPOTHESIS';
  sourceRef: string; approvalRef?: string;
  applicability: Comparison[]; assertions: Comparison[];
}
interface JourneyStep {
  id: string; operationId: string;
  parameters: { location: 'path'|'query'|'header'; name: string; value: Operand }[];
  body?: Json; bodyBindings: { pointer: string; value: Operand }[];
  extracts: StateVariable[]; expectedStatuses: number[];
}
interface Journey {
  id: string; steps: JourneyStep[]; variables: StateVariable[];
  predicateRef: { id: string; version: number; hash: string };
  rationale: string; dependencies: { producer: string; consumer: string; variable: string }[];
}
interface BaselineAssertion { id: string; predicate: Predicate }
interface ResetConfiguration {
  id: string; version: number; resetSteps: JourneyStep[];
  resetAssertions: BaselineAssertion[]; checkSteps: JourneyStep[];
  baselineAssertions: BaselineAssertion[]; // nonempty, all required SATISFIED
}
interface FrozenScope {
  origin: string; hostname: string; port: number; basePathSegments: string[];
  addresses: { ip: string; family: 4|6 }[]; operationIds: string[];
  approvalId: string; mutationsAcknowledged: boolean;
}
interface RunBudget {
  limits: { requests: number; milliseconds: number; journeys: number;
    steps: number; requestTimeoutMs: number; modelTimeoutMs: number };
  usedRequests: number; requestsByPhase: Record<Phase, number>;
  usedExplorationJourneys: number; modelCalls: number; stagnantRounds: number;
  acceptedAt: string; deadlineAt: string; // monotonic deadline derived at acceptance
}
interface ExecutionContext {
  runId: string; trialId: string; phase: Phase; scope: Readonly<FrozenScope>;
  apiModel: Readonly<ApiModel>; predicate: Readonly<Predicate>;
  baselineEvidenceId?: string; signal: AbortSignal;
  // Worker has an execution-intent client, trial SecretVault and sanitized evidence sink.
  // Supervisor alone owns BudgetManager, frozen policy and target HTTP transport.
  // No serialized credential values, socket capability, or AbortSignal in provider payloads.
}
interface ExecutionResult {
  stepId: string; status?: number; sanitizedRequest: Json; sanitizedResponse: Json;
  truncated: boolean; startedAt: string; elapsedMs: number;
  outcome: 'RESPONSE'|'EXECUTION ERROR'|'INTERRUPTED'; errorReason?: string;
}
interface Observation {
  id: string; runId: string; trialId: string; stepId: string;
  result: ExecutionResult; stateMappings: StateMapping[];
}
interface Evidence {
  id: string; runId: string; trialId: string; phase: Phase;
  predicateRef: { id: string; version: number; hash: string };
  baselineEvidenceId: string; observationIds: string[];
  outcome: PredicateOutcome; symbolicOperands: Json; reason?: string;
}
interface Finding {
  id: string; projectId: string; initialEvidenceId: string; replayEvidenceIds: string[];
  predicateRef: { id: string; version: number; hash: string };
  classification: 'OBSERVED VIOLATION'|'CONFIRMED'|'INCONCLUSIVE'|'NON-REPRODUCED';
  consistent: boolean; transitions: Json[]; originalJourneyId: string;
  minimizedJourneyId?: string; minimizationStop?: string;
}
interface TestSession {
  id: string; projectId: string; apiSnapshot: ApiModel; scope: FrozenScope;
  reset: ResetConfiguration; predicates: Predicate[]; budget: RunBudget;
  status: 'ACCEPTED'|'RUNNING'|'STOPPING'|'COMPLETED'|'STOPPED'|'INTERRUPTED';
  stopReason?: string; cancelRequestedAt?: string; modelConfiguration: Json;
}
type Run = TestSession;
interface RegressionArtifact {
  id: string; findingId: string; formatVersion: 1; contentHash: string;
  journey: Journey; predicate: Predicate; reset: ResetConfiguration;
  apiModel: ApiModel; scopeTemplate: Omit<FrozenScope, 'addresses'|'approvalId'>;
  credentialSlots: string[]; generatedAt: string;
  verification: 'UNVERIFIED'|'VERIFIED'; verificationEvidenceIds: string[];
  manifestHash: string;
  verificationAuthority: 'SUPERVISED_RUN_PATH'; // never developer-runner results
  generationState: 'GENERATED'; runnerVersion: string;
}
interface ReasoningProvider {
  propose(input: SanitizedPlanningContext, signal: AbortSignal): Promise<ProviderReply>;
}
interface SanitizedPlanningContext {
  api: ApiModel; mappings: StateMapping[]; observations: Observation[];
  approvedPredicateRefs: Json[]; symbolicInputs: Json; remainingLimits: Json;
  consideredHypothesisHashes: string[];
}
interface ProviderReply {
  proposal: unknown; provider: string; model: string;
  usage: { inputTokens?: number; outputTokens?: number; estimated: boolean };
}
```

Runtime refinement rules: backward-only step references; unique variable/step names; no secret
literal values; parameter names and body pointers must be declared; input schemas validated
against version-correct JSON Schema. Reject prototype keys in binding paths. Headers are
case-insensitive and reserved-header rules apply before merge. Predicates cannot reference removed
steps during minimization. `body` is a typed JSON template, with substitutions only at declared
`bodyBindings` pointers, not string evaluation. A separate ephemeral variable store holds resolved
values and taint; persisted StateVariable records are declarations/symbols only.

Strict step records separate expected response sets (execution validity) from expected invariant
assertions (business correctness). A final status 200 violating an approved expected 403 assertion
must remain evaluable when both outcomes are admitted for investigation.

Execution-intent boundary: only validated operation ID, resolved structured input, run/trial/phase
IDs and baseline reference cross from engine worker to supervisor. The supervisor validates scope,
operation and request input again, accounts using its sole BudgetManager, rechecks cancellation,
then dispatches. No module receives an independent target-network capability. Independent runner
creates its own invocation context and may not mutate original Run/Evidence/verification records.

Schema representation correction (2026-09-30): ApiParameter.schema, ApiOperation.requestBody and
response-schema entries carry standard JSON Schema validation representations containing the
selected original schema and its bounded internal closure. Original internal JSON Pointers and
OpenAPI 3.1 sibling constraints remain intact. They are not flattened Scalar schemas. Existing
Json contracts and persistence fields remain unchanged. Ajv is the validation authority; no
remote loader or custom evaluator is introduced.
