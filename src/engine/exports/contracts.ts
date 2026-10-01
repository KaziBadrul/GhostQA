import { z } from 'zod';
import {
  ApiModelSchema,
  FrozenScopeSchema,
  JourneySchema,
  PredicateSchema,
  ResetConfigurationSchema,
  PredicateRefSchema,
  Id,
  RunSchema,
  MinimizationResultSchema,
  EvidenceSchema,
  BaselineEvidenceSchema,
  ObservationSchema,
  FindingSchema,
  RegressionArtifactSchema,
  PredicateOutcomeSchema,
  Hash,
} from '../contracts';

export const ManifestSchema = z.strictObject({
  formatVersion: z.literal(1),
  runnerVersion: z.string().min(1),
  reset: ResetConfigurationSchema,
  journey: JourneySchema,
  predicate: PredicateSchema,
  predicateRef: PredicateRefSchema,
  assertions: z.array(PredicateSchema.shape.assertions.element).min(1),
  apiModel: ApiModelSchema,
  scopeTemplate: FrozenScopeSchema.omit({ addresses: true, approvalId: true }),
  credentialSlots: z.array(z.string().min(1)),
  credentialBindings: z.array(
    z.strictObject({
      slot: z.string().min(1),
      kind: z.enum(['bearer', 'api-key']),
      location: z.literal('header'),
      name: z.string().min(1),
    }),
  ),
  provenance: z.strictObject({
    runId: Id,
    findingId: Id,
    originalJourneyId: Id,
    bestJourneyId: Id,
    initialEvidenceId: Id,
    replayEvidenceIds: z.array(Id).min(1),
    baselineEvidenceIds: z.array(Id).min(2),
    minimizationEvidenceIds: z.array(Id),
  }),
});
export const ExportTrialSchema = z.strictObject({
  evidence: EvidenceSchema,
  baseline: BaselineEvidenceSchema,
  observations: z.array(ObservationSchema),
  // Existing discovery/replay repository results attach finding metadata.
  // It is descriptive only; export eligibility uses minimization.finding.
  finding: FindingSchema.nullable().optional(),
});
// Eligibility collections are supplied by trusted repository callers at immutable
// run acceptance, never model proposals. No execution/credential capability here.
export const ExportInputSchema = z.strictObject({
  run: RunSchema,
  original: JourneySchema,
  minimization: MinimizationResultSchema,
  initial: ExportTrialSchema,
  replays: z.array(ExportTrialSchema).min(1),
  approvals: z.set(z.string()),
  specificationAssertions: z.map(z.string(), z.string()),
  artifactId: Id,
  generatedAt: z.iso.datetime(),
  runnerVersion: z.string().min(1),
});
export type ExportInput = Omit<
  z.infer<typeof ExportInputSchema>,
  'approvals' | 'specificationAssertions'
> & {
  approvals: ReadonlySet<string>;
  specificationAssertions: ReadonlyMap<string, string>;
};
export type Manifest = z.infer<typeof ManifestSchema>;

export const GeneratedExportSchema = z.strictObject({
  artifact: RegressionArtifactSchema,
  manifest: ManifestSchema,
  bytes: z.string().min(1),
});
export const ArtifactProvenanceSchema = z.strictObject({
  runId: Id,
  manifestHash: Hash,
  authority: z.literal('SUPERVISED_RUN_PATH'),
  assertionIds: z.array(z.string().min(1)).min(1),
});
export const AssertionEvaluationSchema = z.strictObject({
  assertionId: z.string().min(1),
  outcome: PredicateOutcomeSchema,
});
export const ArtifactVerificationSchema = z.strictObject({
  artifactId: Id,
  manifestHash: Hash,
  predicateRef: PredicateRefSchema,
  sourceJourneyId: Id,
  executionJourneyId: Id.optional(),
  trialId: Id.optional(),
  reason: z.enum([
    'ARTIFACT VERIFIED',
    'INTENDED ASSERTION NOT REPRODUCED',
    'ASSERTION SATISFIED',
    'ASSERTION NOT APPLICABLE',
    'ASSERTION UNEVALUABLE',
    'BUDGET EXHAUSTED',
    'TIME EXHAUSTED',
    'CANCELLED',
    'OWNERSHIP LOST',
    'BASELINE ERROR',
    'EXECUTION ERROR',
    'STORAGE ERROR',
    'WORKER ERROR',
    'SHUTDOWN',
  ]),
  verified: z.boolean(),
  verifiedAt: z.iso.datetime().optional(),
  baseline: BaselineEvidenceSchema.optional(),
  evidence: EvidenceSchema.optional(),
  provenance: ArtifactProvenanceSchema.optional(),
  intendedAssertionIds: z.array(z.string().min(1)),
  evaluations: z.array(AssertionEvaluationSchema),
});
export type GeneratedExport = z.infer<typeof GeneratedExportSchema>;
export type ArtifactVerification = z.infer<typeof ArtifactVerificationSchema>;
