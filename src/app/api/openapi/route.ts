import { NextResponse } from 'next/server';
import { parseOpenApi } from '../../../engine/openapi/parse';
import {
  boundedText,
  setupError,
  validSetupWrite,
} from '../../../server/setup-guards';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!validSetupWrite(request))
    return setupError(
      'FORBIDDEN',
      'Refresh this page and try importing again.',
      403,
    );
  if (!request.headers.get('content-type')?.startsWith('text/plain'))
    return setupError(
      'INVALID INPUT',
      'Send a JSON or YAML document as plain text.',
      400,
    );
  try {
    const model = await parseOpenApi(
      await boundedText(request, 2 * 1024 * 1024),
    );
    return NextResponse.json(
      {
        openapiVersion: model.openapiVersion,
        operations: model.operations.map(
          ({ id, method, pathTemplate, eligible, exclusionReasons }) => ({
            id,
            method,
            pathTemplate,
            eligible,
            exclusionReasons,
          }),
        ),
        diagnostics: model.importDiagnostics,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'IMPORT TOO LARGE')
      return setupError(
        'IMPORT TOO LARGE',
        'This document exceeds 2 MiB. Use a smaller specification.',
        413,
      );
    if (error instanceof Error && error.message === 'IMPORT TIMEOUT')
      return setupError(
        'IMPORT TIMEOUT',
        'This document took too long to parse. Simplify it and try again.',
        422,
      );
    return setupError(
      'INVALID OPENAPI',
      'Cannot import this specification. Use OpenAPI 3.0.x or 3.1.x JSON/YAML with local references and no duplicate YAML keys. Remote references and unsupported document constructs are rejected.',
      422,
    );
  }
}
