import { applicationRequest } from '../../../../../server/application-api';
import {
  cancelDemoRun,
  demoRunDetail,
} from '../../../../../server/demo/runtime';
import {
  validSetupWrite,
  setupError,
} from '../../../../../server/setup-guards';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!validSetupWrite(request))
    return setupError('FORBIDDEN', 'Refresh the page and try again.', 403);
  if (await demoRunDetail(id)) {
    try {
      return NextResponse.json(await cancelDemoRun(id));
    } catch {
      return setupError(
        'RUN ADMISSION IN PROGRESS',
        'The run is still being admitted. Try cancel again in a moment.',
        409,
      );
    }
  }
  return applicationRequest(request, 'cancel', id);
}
