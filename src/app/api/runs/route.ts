import {
  boundedText,
  validSetupWrite,
  localRequest,
  setupError,
} from '../../../server/setup-guards';
import { NextResponse } from 'next/server';
import { StartRunRequestSchema } from '@/server/demo/contracts';
import { demoRunList, startDemoRun } from '@/server/demo/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!localRequest(request))
    return setupError('FORBIDDEN', 'Use the local application.', 403);
  return NextResponse.json(await demoRunList());
}

export async function POST(request: Request) {
  if (!validSetupWrite(request))
    return setupError('FORBIDDEN', 'Refresh the page and try again.', 403);
  let body: unknown;
  try {
    body = JSON.parse(await boundedText(request, 4096));
  } catch {
    return NextResponse.json({ error: 'INVALID REQUEST' }, { status: 400 });
  }
  const parsed = StartRunRequestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: 'INVALID FIXTURE' }, { status: 400 });

  try {
    const run = await startDemoRun(parsed.data.fixture);
    return NextResponse.json({ run }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'ANOTHER RUN IN PROGRESS')
      return NextResponse.json({ error: message }, { status: 409 });
    // Configuration problems are reported as a plain code, never as raw text
    // that could carry a credential.
    const invalid = [
      'DATABASE_URL',
      'GEMINI_API_KEY',
      'GEMINI_MODEL',
      'GHOSTQA_CREDENTIAL_KEY',
      'GEMINI_REQUESTS_PER_MINUTE',
    ];
    if (invalid.some((name) => message.includes(name)))
      return NextResponse.json(
        {
          error: 'Invalid application configuration',
          missing: invalid.filter((name) => message.includes(name)),
        },
        { status: 503 },
      );
    return NextResponse.json({ error: 'ENGINE ERROR' }, { status: 500 });
  }
}
