import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseOpenApi } from '../../../engine/openapi/parse';
import {
  ConversionSchema,
  SavedProjectSchema,
} from '../../../server/mcp/contracts';
import {
  archiveFiles,
  conversionPreview,
  packageFiles,
} from '../../../server/mcp/generator';
import {
  boundedText,
  setupError,
  validSetupWrite,
} from '../../../server/setup-guards';
import { application } from '../../../server/application-runtime';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!validSetupWrite(request))
    return setupError(
      'FORBIDDEN',
      'Refresh this local page and try again.',
      403,
    );
  try {
    const raw: unknown = JSON.parse(
      await boundedText(request, 3 * 1024 * 1024),
    );
    const preview = z
      .strictObject({
        action: z.literal('preview'),
        source: z
          .string()
          .max(2 * 1024 * 1024)
          .optional(),
        projectId: z.uuid().optional(),
      })
      .refine((input) => Boolean(input.source) !== Boolean(input.projectId))
      .safeParse(raw);
    const input = preview.success ? preview.data : ConversionSchema.parse(raw);
    const model = input.source
      ? await parseOpenApi(input.source)
      : SavedProjectSchema.parse(
          await application().command('get', input.projectId),
        ).project.specification;
    if (!model)
      return setupError(
        'INVALID INPUT',
        'Save an OpenAPI specification for this project first.',
        422,
      );
    if (preview.success)
      return NextResponse.json(
        { operations: conversionPreview(model) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    const archive = archiveFiles(
      await packageFiles(model, ConversionSchema.parse(raw)),
    );
    return new Response(new Uint8Array(archive), {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="api-mcp-server.tar.gz"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return setupError(
        'INVALID INPUT',
        'Check the selected tools, authentication settings and approved notes.',
        400,
      );
    const code = error instanceof Error ? error.message : '';
    const messages: Record<string, string> = {
      'SECRET IN DOCUMENTATION':
        'Remove credentials from the name, URL and notes. Supply credentials only in the downloaded server environment.',
      'INVALID DESTINATION':
        'Use an HTTP/HTTPS base URL without credentials, query, fragment or traversal.',
      'INVALID PATH': 'The base URL contains an unsafe path.',
      'UNSUPPORTED SELECTION':
        'A selected operation is unsupported. Inspect the endpoint diagnostics.',
      'UNSUPPORTED SCHEMA':
        'A selected schema cannot be compiled. Inspect your specification.',
      'IMPORT TOO LARGE': 'The specification exceeds the 2 MiB import limit.',
      'IMPORT TIMEOUT':
        'Import timed out. Simplify the specification and try again.',
      'INVALID OPENAPI':
        'Use supported OpenAPI 3.0/3.1 JSON/YAML with local references and unique keys.',
      'APPLICATION UNAVAILABLE':
        'Saved projects require the GhostQA application server; direct upload remains available.',
      'NOT FOUND': 'The saved project no longer exists.',
    };
    return setupError(
      'MCP GENERATION FAILED',
      messages[code] ??
        'Could not generate this package. Check the input and try again.',
      422,
    );
  }
}
