import { randomUUID } from 'node:crypto';
import type {
  ApiModel,
  Journey,
  Json,
  Observation,
  Run,
  StateMapping,
} from '../../src/engine/contracts';
import type { SecretVault } from '../../src/engine/secrets/vault';
import { makeRun } from './run';
import { makeJourney } from './journey';

// Test-only consumer ports. T032 owns their production implementation. Dynamic
// imports keep the existing application buildable while these TDD tests are red.
export interface PlanningContext {
  api: ApiModel;
  mappings: StateMapping[];
  observations: Observation[];
  approvedPredicateRefs: Json[];
  predicateDefinitions?: Json[];
  symbolicInputs: Json;
  remainingLimits: Json;
  consideredHypothesisHashes: string[];
}
export interface ProviderReply {
  proposal: unknown;
  provider: string;
  model: string;
  usage: { inputTokens?: number; outputTokens?: number; estimated: boolean };
}
export interface ReasoningProvider {
  propose(input: PlanningContext, signal: AbortSignal): Promise<ProviderReply>;
}
export interface ContextInput {
  run: Run;
  mappings: StateMapping[];
  observations: Observation[];
  symbolicInputs: Json;
  consideredHypothesisHashes: string[];
}
export interface RequestInput {
  provider: ReasoningProvider;
  context: PlanningContext;
  api: ApiModel;
  scope: Run['scope'];
  model: string;
  signal: AbortSignal;
  timeoutMs: number;
  remainingMilliseconds: number;
}
export interface ProviderBoundary {
  requestProposal(input: RequestInput): Promise<ProviderReply>;
}
export interface ContextBoundary {
  buildPlanningContext(
    input: ContextInput,
    vault: SecretVault,
  ): PlanningContext;
}
export async function providerBoundary(): Promise<ProviderBoundary> {
  const path = '../../src/engine/planning/provider.ts';
  const loaded: unknown = await import(path);
  if (
    !loaded ||
    typeof loaded !== 'object' ||
    !('requestProposal' in loaded) ||
    typeof loaded.requestProposal !== 'function'
  )
    throw new Error('T032 must implement the tested requestProposal boundary');
  return loaded as ProviderBoundary;
}
export async function contextBoundary(): Promise<ContextBoundary> {
  const path = '../../src/engine/planning/context.ts';
  const loaded: unknown = await import(path);
  if (
    !loaded ||
    typeof loaded !== 'object' ||
    !('buildPlanningContext' in loaded) ||
    typeof loaded.buildPlanningContext !== 'function'
  )
    throw new Error(
      'T032 must implement the tested buildPlanningContext boundary',
    );
  return loaded as ContextBoundary;
}
export function planningFixture() {
  const run = makeRun(randomUUID());
  const journey = makeJourney();
  journey.predicateRef = {
    id: run.predicates[0]!.id,
    version: 1,
    hash: run.predicates[0]!.canonicalHash,
  };
  const context: PlanningContext = {
    api: {
      ...run.apiSnapshot,
      operations: run.apiSnapshot.operations.filter(
        (o) => o.id === 'GET /api/item',
      ),
    },
    mappings: [],
    observations: [],
    approvedPredicateRefs: [journey.predicateRef],
    predicateDefinitions: [],
    symbolicInputs: {},
    remainingLimits: { steps: 10, requests: 200 },
    consideredHypothesisHashes: [],
  };
  return { run, journey, context };
}
export function reply(proposal: unknown): ProviderReply {
  return {
    proposal,
    provider: 'mock-provider',
    model: 'configured-model',
    usage: { inputTokens: 12, outputTokens: 8, estimated: false },
  };
}
export function validProposal(): Journey {
  return planningFixture().journey;
}
