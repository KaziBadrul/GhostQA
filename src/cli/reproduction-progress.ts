// Read-only orchestration telemetry; carries no dispatch or authorization capability.
export type ReproductionStage =
  | 'RUN_ADMISSION'
  | 'DISCOVERY'
  | 'CONFIRMATION'
  | 'MINIMIZATION'
  | 'EVIDENCE_LOADING'
  | 'REPORT_GENERATION'
  | 'MANIFEST_GENERATION'
  | 'SUPERVISED_VERIFICATION'
  | 'PREDICATE_IDENTITY'
  | 'BUNDLE_GENERATION'
  | 'BUNDLE_ISOLATION'
  | 'RUN_COMPLETION';
export type ReproductionProgress = (
  stage: ReproductionStage,
  completed: boolean,
) => void;
