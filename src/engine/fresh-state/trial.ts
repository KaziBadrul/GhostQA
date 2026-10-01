import type { BaselineEvidence } from '../contracts';
import type { ValueContext } from '../execution/variables';
export interface AdmittedTrial {
  id: string;
  baseline: BaselineEvidence;
  values: ValueContext;
}
