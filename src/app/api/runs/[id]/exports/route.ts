import {
  readDemoReport,
  readDemoBundle,
} from '../../../../../server/demo/store';
import { localRequest, setupError } from '../../../../../server/setup-guards';
import { NextResponse } from 'next/server';
import { applicationRequest } from '../../../../../server/application-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  if (!localRequest(request))
    return setupError('FORBIDDEN', 'Use the local application.', 403);
  const report = await readDemoReport(params.id);
  if (report)
    return NextResponse.json({
      ...report,
      bundle: await readDemoBundle(params.id),
    });
  return applicationRequest(request, 'export', params.id, undefined);
}
