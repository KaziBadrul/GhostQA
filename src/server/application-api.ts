import { errorGuidance } from '../lib/error-guidance';
import { validationIssues } from '../lib/validation-issues';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { application } from './application-runtime';
import {
  boundedText,
  localRequest,
  validSetupWrite,
  setupError,
} from './setup-guards';
import { Id } from '../engine/contracts';
export async function applicationRequest(
  request: Request,
  action: string,
  projectId?: string,
  extra?: string,
) {
  if (
    !localRequest(request) ||
    (request.method !== 'GET' && !validSetupWrite(request))
  )
    return setupError(
      'FORBIDDEN',
      'Refresh the page and use the local GhostQA application.',
      403,
    );
  if (projectId && !Id.safeParse(projectId).success)
    return setupError('NOT FOUND', 'This project or run does not exist.', 404);
  try {
    let value: unknown;
    if (request.method !== 'GET') {
      const raw = await boundedText(
        request,
        action === 'import' ? 2 * 1024 * 1024 : 128 * 1024,
      );
      value = action === 'import' ? raw : JSON.parse(raw);
    }
    const result = await application().command(action, projectId, value, extra);
    return NextResponse.json(result, {
      status: action === 'start' ? 202 : action === 'create' ? 201 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      const code =
        error instanceof SyntaxError ? 'INVALID JSON' : 'INVALID INPUT';
      const info = errorGuidance(code);
      return setupError(
        code,
        `${info.message} ${info.action}`,
        400,
        error instanceof z.ZodError ? validationIssues(error) : [],
      );
    }
    const code = error instanceof Error ? error.message : '';
    const errors: Record<string, [number, string]> = {
      'RUN ADMISSION IN PROGRESS': [
        409,
        'The run is still being admitted. Check its status before trying again.',
      ],
      'NOT FOUND': [404, 'This project or run does not exist.'],
      'SUPERVISOR BUSY': [
        409,
        'Another run is active. Wait for it to finish or cancel it.',
      ],
      'ANOTHER RUN IN PROGRESS': [
        409,
        'Another run is active. Wait for it to finish or cancel it.',
      ],
      'STALE PREVIEW': [
        409,
        'The scope preview expired or the project changed. Review the scope again.',
      ],
      'SETUP REQUIRED': [
        422,
        'Save a specification, target, reset/baseline checks, and approved invariant before starting.',
      ],
      'INVALID SETUP': [
        422,
        'The reset, baseline, invariant, or operation policy is invalid for this specification. Check operation names, bindings, and assertions.',
      ],
      'SECRET IN CONFIGURATION': [
        422,
        'Use encrypted credential slots. Do not put credential values in setup definitions.',
      ],
      'IMPORT TOO LARGE': [413, 'The document exceeds the import size limit.'],
      'INVALID OPENAPI': [
        422,
        'Use supported OpenAPI 3.0/3.1 JSON or YAML, local references, and unique keys.',
      ],
      'IMPORT TIMEOUT': [422, 'Import timed out. Use a smaller document.'],
      'MODEL QUOTA EXHAUSTED': [503, 'Provider quota was exhausted.'],
      'MODEL REQUEST REJECTED': [503, 'Provider request was rejected.'],
      'MODEL UNAVAILABLE': [
        503,
        'The configured Gemini model is unavailable. Check server configuration.',
      ],
      'CREDENTIAL STORAGE ERROR': [
        503,
        'Credentials could not be encrypted and saved. Check the database and credential key.',
      ],
      'APPLICATION UNAVAILABLE': [
        503,
        'Start GhostQA using npm run dev or npm start, then refresh.',
      ],
      'CONFIRMATION REQUIRED': [
        400,
        'Explicit project deletion confirmation is required.',
      ],
      'CREDENTIAL UNAVAILABLE': [
        422,
        'A configured credential slot could not be decrypted. Replace it before starting.',
      ],
    };
    const setupCodes = [
      'PHASE CONFLICT',
      'CONTROL EXCLUDED',
      'NO EXPLORATION',
      'UNKNOWN OPERATION',
      'MISSING PARAMETER',
      'MISSING BODY',
      'INVALID BODY',
      'INVALID BODY POINTER',
      'DUPLICATE STEP',
      'ASSERTION STEP',
      'INVALID DEPENDENCY',
    ].map((rule) => `INVALID SETUP: ${rule}`);
    const known =
      errors[code] ??
      (setupCodes.includes(code) || code === 'TARGET RESOLUTION FAILED'
        ? ([422, ''] as const)
        : undefined);
    const safeCode = known ? code : 'STORAGE ERROR';
    const info = errorGuidance(safeCode);
    return setupError(
      safeCode,
      `${info.message} ${info.action}`,
      known?.[0] ?? 503,
    );
  }
}
