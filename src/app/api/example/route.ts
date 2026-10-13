import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { localRequest, setupError } from '../../../server/setup-guards';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!localRequest(request))
    return setupError('FORBIDDEN', 'Use the local application.', 403);
  return new Response(
    await readFile(resolve('examples/orders.openapi.json'), 'utf8'),
    {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="orders.openapi.json"',
      },
    },
  );
}
