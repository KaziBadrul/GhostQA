import { applicationRequest } from '../../../../../server/application-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  return applicationRequest(request, 'trace', params.id, undefined);
}
