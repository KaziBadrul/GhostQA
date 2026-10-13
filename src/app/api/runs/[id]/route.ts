import { localRequest, setupError } from '@/server/setup-guards';
import { applicationRequest } from '../../../../server/application-api';
import { NextResponse } from 'next/server';
import { demoRunDetail } from '@/server/demo/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!localRequest(request))
    return setupError('FORBIDDEN', 'Use the local GhostQA application.', 403);
  const { id } = await context.params;
  const run = await demoRunDetail(id);
  if (!run) return applicationRequest(request, 'run', id);
  return NextResponse.json({ run });
}
