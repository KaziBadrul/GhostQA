import { localRequest, setupError } from '@/server/setup-guards';
import { applicationRequest } from '../../../../../server/application-api';
import { NextResponse } from 'next/server';
import { readDemoReport } from '@/server/demo/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!localRequest(request))
    return setupError('FORBIDDEN', 'Use the local GhostQA application.', 403);
  const { id } = await context.params;
  const report = await readDemoReport(id);
  if (!report) return applicationRequest(request, 'report', id);
  return NextResponse.json(report);
}
