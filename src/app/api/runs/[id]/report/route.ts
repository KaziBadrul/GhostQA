import { NextResponse } from 'next/server';
import { readDemoReport } from '@/server/demo/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const report = await readDemoReport(id);
  if (!report)
    return NextResponse.json({ error: 'NO REPORT' }, { status: 404 });
  return NextResponse.json(report);
}