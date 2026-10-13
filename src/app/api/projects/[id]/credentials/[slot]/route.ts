import { applicationRequest } from '../../../../../../server/application-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; slot: string }> },
) {
  const params = await context.params;
  return applicationRequest(request, 'credential', params.id, params.slot);
}
