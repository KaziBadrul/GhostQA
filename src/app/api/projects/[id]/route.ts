import { applicationRequest } from '../../../../server/application-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  return applicationRequest(request, 'get', params.id, undefined);
}
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  return applicationRequest(request, 'edit', params.id, undefined);
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  return applicationRequest(request, 'delete', params.id, undefined);
}
