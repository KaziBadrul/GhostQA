import { NextResponse } from 'next/server';
import { z } from 'zod';
import { processNotes } from '../../../../server/mcp/notes';
import {
  boundedText,
  setupError,
  validSetupWrite,
} from '../../../../server/setup-guards';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!validSetupWrite(request))
    return setupError(
      'FORBIDDEN',
      'Refresh this local page and try again.',
      403,
    );
  try {
    const input = z
      .strictObject({ notes: z.string().max(16000) })
      .parse(JSON.parse(await boundedText(request, 100000)));
    return NextResponse.json(await processNotes(input.notes), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return setupError(
      'INVALID INPUT',
      'Notes must be text, at most 16,000 characters.',
      400,
    );
  }
}
