// Client-safe presentation constants for the submission track. This module
// must stay free of server-only imports so the browser bundle never pulls in
// the database pool, the reasoning provider, or the deterministic executor.
import type { DemoStage } from '@/server/demo/contracts';

// Smaller than the engine default so a live presentation finishes. The engine
// still enforces every limit itself.
export const DEMO_LIMITS = Object.freeze({
  requests: 60,
  milliseconds: 480_000,
  journeys: 10,
  steps: 10,
  requestTimeoutMs: 10_000,
  modelTimeoutMs: 30_000,
});

export const DEMO_PIPELINE_STAGES: DemoStage[] = [
  'ADMITTING RUN',
  'PLANNING JOURNEY',
  'RESETTING TARGET',
  'VERIFYING BASELINE',
  'EXECUTING JOURNEY',
  'CONFIRMING FROM FRESH STATE',
  'MINIMIZING',
  'LOADING EVIDENCE',
  'GENERATING REPORT',
  'VERIFYING ARTIFACT',
  'PACKAGING ARTIFACT',
  'COMPLETE',
];

export const DEMO_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  DEMO_PIPELINE_STAGES.map((stage) => [
    stage,
    stage
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^./, (character) => character.toUpperCase()),
  ]),
);