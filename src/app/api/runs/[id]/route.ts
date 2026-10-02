import { NextResponse } from 'next/server';
import { demoRunDetail } from '@/server/demo/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const run = await demoRunDetail(id);
  if (!run) return NextResponse.json({ error: 'UNKNOWN RUN' }, { status: 404 });
  return NextResponse.json({ run });
}