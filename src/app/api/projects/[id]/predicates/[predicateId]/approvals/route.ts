import { applicationRequest } from '../../../../../../../server/application-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; predicateId: string }> },
) {
  const params = await context.params;
  return applicationRequest(request, 'approve', params.id, params.predicateId);
}
