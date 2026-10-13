export const setupSteps = [
  {
    title: 'API specification',
    description: 'Import the operations GhostQA can understand.',
  },
  {
    title: 'Target and operations',
    description: 'Choose a disposable target, limits, and allowed operations.',
  },
  {
    title: 'Authentication',
    description:
      'Save encrypted credentials, or continue without authentication.',
  },
  {
    title: 'Fresh-state checks',
    description:
      'Define how to reset the API and verify a clean starting state.',
  },
  {
    title: 'Expected behavior',
    description:
      'Save a business rule and explicitly approve its saved version.',
  },
  {
    title: 'Review and run',
    description:
      'Review the saved setup, freeze the scope, and approve execution.',
  },
] as const;
export interface SetupProgress {
  specification: boolean;
  target: boolean;
  credentials: boolean;
  reset: boolean;
  invariant: boolean;
  approved: boolean;
}
export function firstIncompleteStep(progress: SetupProgress): number {
  if (!progress.specification) return 0;
  if (!progress.target) return 1;
  if (!progress.reset) return 3;
  if (!progress.invariant || !progress.approved) return 4;
  return 5;
}
export function setupStepStatus(step: number, progress: SetupProgress): string {
  switch (step) {
    case 0:
      return progress.specification ? 'Saved' : 'Required';
    case 1:
      return progress.target ? 'Saved' : 'Required';
    case 2:
      return progress.credentials ? 'Saved' : 'Optional';
    case 3:
      return progress.reset ? 'Saved' : 'Required';
    case 4:
      return progress.approved
        ? 'Approved'
        : progress.invariant
          ? 'Needs approval'
          : 'Required';
    default:
      return firstIncompleteStep(progress) === 5
        ? 'Ready to review'
        : 'Setup incomplete';
  }
}
