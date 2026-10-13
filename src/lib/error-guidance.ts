import { z } from 'zod';
import { validationIssues } from './validation-issues';
export interface ErrorGuidance {
  title: string;
  message: string;
  action: string;
  step?: number;
}
const guidance: Record<string, ErrorGuidance> = {
  FORBIDDEN: {
    title: 'Local session needs refreshing',
    message:
      'The request did not pass the local host, origin, or session check.',
    action: 'Open GhostQA on localhost, refresh this page, then submit again.',
  },
  'INVALID INPUT': {
    title: 'Check the form fields',
    message: 'One or more values do not match the required format.',
    action:
      'Correct the listed fields. JSON definitions must contain only supported fields.',
  },
  'INVALID JSON': {
    title: 'The definition is not valid JSON',
    message: 'The JSON editor contains a syntax error.',
    action:
      'Check commas, double quotes, and brackets, or load the Orders example again.',
  },
  'NOT FOUND': {
    title: 'Project or run not found',
    message: 'The saved item is no longer available.',
    action: 'Return to Projects and open an existing project.',
  },
  'SUPERVISOR BUSY': {
    title: 'Another test is running',
    message: 'Only one supervised run can execute at a time.',
    action:
      'Wait for the active run to finish, or cancel it from its run page.',
  },
  'ANOTHER RUN IN PROGRESS': {
    title: 'Another test is running',
    message: 'An active run is using this project or the supervisor.',
    action: 'Wait for it to finish or cancel it before trying again.',
  },
  'RUN ADMISSION IN PROGRESS': {
    title: 'The run is still being admitted',
    message: 'The supervisor has not acknowledged execution yet.',
    action:
      'Check the run page before sending another start or cancellation request.',
  },
  'STALE PREVIEW': {
    title: 'Execution approval expired',
    message: 'The 60-second preview expired, or saved setup changed.',
    action:
      'Generate a new scope preview, review it, and acknowledge mutations again.',
    step: 5,
  },
  'SETUP REQUIRED': {
    title: 'A required setup step is missing',
    message:
      'Execution needs a specification, target, fresh-state checks, and approved invariant.',
    action: 'Complete the required steps shown in the setup navigation.',
  },
  'UNSAVED SPECIFICATION': {
    title: 'Save the specification first',
    message: 'The imported text has not been saved to this project.',
    action: 'Click Save specification before continuing.',
    step: 0,
  },
  'UNSAVED SETTINGS': {
    title: 'Target settings have changed',
    message: 'The review must use the settings you have saved.',
    action: 'Save target settings and exclusions, then generate a new preview.',
    step: 1,
  },
  'UNSAVED CREDENTIAL': {
    title: 'Credential has not been saved',
    message: 'The entered secret is not yet available for execution.',
    action:
      'Save the encrypted credential, or clear the secret to continue without it.',
    step: 2,
  },
  'UNSAVED CHECKS': {
    title: 'Save the fresh-state checks',
    message: 'Checks are missing or have unsaved edits.',
    action:
      'Save simple checks or save the advanced definition before continuing.',
    step: 3,
  },
  'UNAPPROVED INVARIANT': {
    title: 'Expected behavior needs approval',
    message: 'The invariant is missing, edited, or not approved.',
    action:
      'Save the invariant, review the saved rule, then explicitly approve it.',
    step: 4,
  },
  'TARGET RESOLUTION FAILED': {
    title: 'Target hostname could not be resolved',
    message: 'DNS resolution failed or exceeded the preview deadline.',
    action:
      'Check the target hostname and local DNS. For the Orders example, use http://127.0.0.1:4010/api.',
    step: 1,
  },
  'INVALID SETUP: PHASE CONFLICT': {
    title: 'Reset and baseline use the same operation',
    message: 'Fresh-state operations need distinct phase classifications.',
    action: 'Choose separate reset and baseline inspection operations.',
    step: 3,
  },
  'INVALID SETUP: CONTROL EXCLUDED': {
    title: 'A fresh-state operation is excluded',
    message:
      'A configured reset or baseline operation cannot execute under the saved exclusions.',
    action:
      'Include that control operation in Target and operations, or replace it in the checks.',
    step: 1,
  },
  'INVALID SETUP: NO EXPLORATION': {
    title: 'No operations remain to explore',
    message:
      'Every eligible operation is excluded or reserved for fresh-state checks.',
    action: 'Include at least one business operation for exploration.',
    step: 1,
  },
  'INVALID SETUP: UNKNOWN OPERATION': {
    title: 'A check refers to an unavailable operation',
    message:
      'A reset or baseline operation does not match an eligible imported operation.',
    action: 'Use an exact supported operation ID from the imported API.',
    step: 3,
  },
  'INVALID SETUP: MISSING PARAMETER': {
    title: 'A check is missing a required parameter',
    message: 'The API requires a parameter that the check does not provide.',
    action:
      'Open Advanced reset definition and add the required path, query, or header parameter.',
    step: 3,
  },
  'INVALID SETUP: MISSING BODY': {
    title: 'A check is missing its request body',
    message: 'The selected operation requires a request body.',
    action:
      'Open Advanced reset definition and add a body matching the imported schema.',
    step: 3,
  },
  'INVALID SETUP: INVALID BODY': {
    title: 'A check has an invalid request body',
    message: 'The configured body does not match the API schema.',
    action:
      'Correct required properties and JSON types in Advanced reset definition.',
    step: 3,
  },
  'INVALID SETUP: INVALID BODY POINTER': {
    title: 'A binding points to a missing body field',
    message: 'The body binding cannot be resolved in its JSON template.',
    action: 'Add the field to the body template or correct its JSON Pointer.',
    step: 3,
  },
  'INVALID SETUP: DUPLICATE STEP': {
    title: 'Check step names are duplicated',
    message: 'Reset and baseline requests must have distinct step IDs.',
    action:
      'Rename duplicate steps and update assertions to use the correct names.',
    step: 3,
  },
  'INVALID SETUP: ASSERTION STEP': {
    title: 'An assertion refers to a missing check',
    message:
      'The assertion uses a step name absent from the reset and baseline definitions.',
    action:
      'Match each assertion stepId to the request that produces its response.',
    step: 3,
  },
  'INVALID SETUP: INVALID DEPENDENCY': {
    title: 'Check dependencies cannot be resolved',
    message: 'A value binding has no valid configured producer.',
    action:
      'Correct the request bindings and extraction rules in Advanced reset definition.',
    step: 3,
  },
  'INVALID SETUP': {
    title: 'Setup does not match the API',
    message:
      'An operation, binding, assertion, or phase classification is invalid.',
    action:
      'Check exact operation IDs and required bodies in the advanced checks. Reset and baseline operations must be distinct and included.',
    step: 3,
  },
  'SECRET IN CONFIGURATION': {
    title: 'A credential was found in setup',
    message: 'Raw credential values cannot be stored in ordinary definitions.',
    action:
      'Remove the secret from the definition and use an encrypted credential slot.',
    step: 2,
  },
  'IMPORT TOO LARGE': {
    title: 'The document is too large',
    message: 'The request exceeds the accepted size limit.',
    action: 'Use an OpenAPI document under 2 MiB, or shorten the setup JSON.',
    step: 0,
  },
  'INVALID OPENAPI': {
    title: 'OpenAPI could not be imported',
    message: 'The document is invalid or contains unsupported constructs.',
    action:
      'Use OpenAPI 3.0 or 3.1 JSON/YAML with local references and unique YAML keys.',
    step: 0,
  },
  'IMPORT TIMEOUT': {
    title: 'Import timed out',
    message: 'The document could not be processed within the import deadline.',
    action: 'Use a smaller specification and import it again.',
    step: 0,
  },
  'CREDENTIAL STORAGE ERROR': {
    title: 'Credential could not be saved',
    message: 'Encryption or persistence failed.',
    action:
      'Check PostgreSQL and GHOSTQA_CREDENTIAL_KEY on the server, then save the credential again.',
    step: 2,
  },
  'CREDENTIAL UNAVAILABLE': {
    title: 'Saved credential cannot be opened',
    message: 'The referenced credential version could not be decrypted.',
    action:
      'Restore the original encryption key or replace the credential in this project.',
    step: 2,
  },
  'MODEL UNAVAILABLE': {
    title: 'Gemini is unavailable',
    message: 'The configured model or provider request is unavailable.',
    action:
      'Check GEMINI_MODEL, GEMINI_API_KEY and provider availability. Start a new run only after configuration is corrected.',
  },
  'MODEL QUOTA EXHAUSTED': {
    title: 'Gemini quota or rate limit reached',
    message: 'The provider refused the planning request.',
    action:
      'Check provider quota and request limits, wait for availability, then explicitly start a new run.',
  },
  'MODEL TIMEOUT': {
    title: 'Gemini planning timed out',
    message:
      'The provider did not finish a proposal before the planning deadline.',
    action:
      'Check provider availability, reduce the specification if needed, then start a new run. No automatic replay was performed.',
  },
  'MODEL INVALID OUTPUT': {
    title: 'Gemini returned malformed output',
    message: 'The response did not match the structured proposal contract.',
    action:
      'Start a new run for a fresh proposal. If it repeats, inspect sanitized planning diagnostics and the configured model.',
  },
  'MODEL INVALID PLAN': {
    title: 'The proposed workflow was rejected',
    message:
      'The proposal failed operation, parameter, binding, dependency, or predicate validation.',
    action:
      'Inspect the planning trace and API definitions, then start a new run. Validation was not relaxed.',
  },
  'MODEL REQUEST REJECTED': {
    title: 'Gemini rejected the planning request',
    message:
      'The provider rejected the request before returning a usable proposal.',
    action:
      'Check the configured model and its structured-output support. A new run is needed after correction.',
  },
  'MODEL ERROR': {
    title: 'Planning did not produce a usable workflow',
    message:
      'This run has no more specific recorded planning failure category.',
    action:
      'Inspect the planning trace and Gemini configuration, then explicitly start a new run.',
  },
  'TARGET UNAVAILABLE': {
    title: 'The test target is unavailable',
    message: 'GhostQA could not start or reach the disposable target.',
    action:
      'Start the example with npm run example, or check your development API address.',
  },
  'BASELINE ERROR': {
    title: 'Fresh state could not be verified',
    message:
      'Reset or baseline checks did not establish a valid starting state.',
    action:
      'Check the reset response and baseline fields in the trace. For Orders, use /reset = true and /orders = 0.',
    step: 3,
  },
  'EXECUTION ERROR': {
    title: 'A target request could not complete',
    message:
      'A trial stopped on an execution failure; this alone is not a product bug.',
    action:
      'Inspect the request and response trace and target logs. Target state may have changed; do not blindly replay mutations.',
  },
  STAGNATION: {
    title: 'Exploration stopped making progress',
    message:
      'The model repeatedly proposed journeys without useful new progress.',
    action:
      'Review the approved invariant and available operations, then adjust the setup for a new run.',
  },
  'BUDGET EXHAUSTED': {
    title: 'The request budget was exhausted',
    message: 'The run cannot authorize additional target requests.',
    action:
      'Review the evidence. If further testing is needed, approve a new run with an appropriate finite budget.',
    step: 1,
  },
  'TIME EXHAUSTED': {
    title: 'The run reached its time limit',
    message: 'The elapsed-time deadline stopped further execution.',
    action:
      'Review completed evidence and approve a new run if more time is needed.',
    step: 1,
  },
  CANCELLED: {
    title: 'The run was cancelled',
    message:
      'New target dispatch is disabled. Completed mutations are not undone.',
    action:
      'Inspect the recorded evidence before approving a separate new run.',
  },
  'APPLICATION UNAVAILABLE': {
    title: 'GhostQA server is unavailable',
    message: 'The long-lived application runtime is not ready.',
    action: 'Start the app with npm run dev or npm start, then refresh.',
  },
  'STORAGE ERROR': {
    title: 'The operation could not be persisted',
    message: 'GhostQA could not complete the database operation.',
    action:
      'Check PostgreSQL and the server configuration. Check existing saved state before submitting again.',
  },
  'ENGINE ERROR': {
    title: 'The supervised run could not complete',
    message: 'The run stopped without a more specific recorded failure.',
    action:
      'Inspect its stop reason and sanitized trace. Interrupted runs are never automatically resumed.',
  },
  'CONFIRMATION REQUIRED': {
    title: 'Deletion has not been confirmed',
    message: 'Permanent project deletion requires an explicit acknowledgement.',
    action:
      'Select the deletion checkbox only if you intend to remove the project and its saved evidence.',
  },
  'READ TIMEOUT': {
    title: 'Loading took too long',
    message: 'The local server did not respond before the deadline.',
    action: 'Check that GhostQA is running and reload the page.',
  },
  'WRITE TIMEOUT': {
    title: 'The request outcome is unknown',
    message:
      'The browser stopped waiting; the server may still have accepted the save or start.',
    action:
      'Check saved project state and run history before submitting again. Do not start a duplicate run.',
  },
  'NETWORK ERROR': {
    title: 'Connection to GhostQA was lost',
    message:
      'The local request did not complete. A submitted change may already have been accepted.',
    action:
      'Check the server and saved project or run state before repeating the request.',
  },
};
export function errorGuidance(code: string): ErrorGuidance {
  return (
    guidance[code] ?? {
      title: 'The operation could not complete',
      message: 'No recognized error category was returned.',
      action: 'Check the local server and saved state before trying again.',
    }
  );
}
export interface FieldIssue {
  field: string;
  message: string;
}
export class AppRequestError extends Error {
  constructor(
    readonly code: string,
    readonly status = 0,
    readonly issues: FieldIssue[] = [],
  ) {
    const info = errorGuidance(code);
    super(`${info.message} ${info.action}`);
    this.name = 'AppRequestError';
  }
}
export function describeError(
  error: unknown,
): ErrorGuidance & { issues: FieldIssue[] } {
  if (error instanceof AppRequestError)
    return { ...errorGuidance(error.code), issues: error.issues };
  if (error instanceof z.ZodError)
    return {
      ...errorGuidance('INVALID INPUT'),
      issues: validationIssues(error),
    };
  if (error instanceof SyntaxError)
    return { ...errorGuidance('INVALID JSON'), issues: [] };
  return { ...errorGuidance('INVALID INPUT'), issues: [] };
}
