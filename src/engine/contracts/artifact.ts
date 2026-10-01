import { z } from 'zod';
import { Id, Hash } from './common';
import { JourneySchema, ResetConfigurationSchema } from './journey';
import { PredicateSchema } from './predicate';
import { ApiModelSchema, FrozenScopeSchema } from './api';
export const RegressionArtifactSchema = z
  .strictObject({
    id: Id,
    findingId: Id,
    formatVersion: z.literal(1),
    contentHash: Hash,
    journey: JourneySchema,
    predicate: PredicateSchema,
    reset: ResetConfigurationSchema,
    apiModel: ApiModelSchema,
    scopeTemplate: FrozenScopeSchema.omit({
      addresses: true,
      approvalId: true,
    }),
    credentialSlots: z.array(z.string()),
    generatedAt: z.iso.datetime(),
    verification: z.enum(['UNVERIFIED', 'VERIFIED']),
    verificationEvidenceIds: z.array(Id),
    manifestHash: Hash,
    verificationAuthority: z.literal('SUPERVISED_RUN_PATH'),
    generationState: z.literal('GENERATED'),
    runnerVersion: z.string(),
  })
  .refine(
    (x) =>
      x.verification !== 'VERIFIED' || x.verificationEvidenceIds.length > 0,
    'Missing verification evidence',
  );
export type RegressionArtifact = z.infer<typeof RegressionArtifactSchema>;
