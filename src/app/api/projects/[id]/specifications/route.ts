import { applicationRequest } from '../../../../../server/application-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  return applicationRequest(request, 'import', params.id, undefined);
}
