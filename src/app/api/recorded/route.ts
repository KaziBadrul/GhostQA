import { NextResponse } from 'next/server';
import { recordedRuns } from '@/server/demo/recorded';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ runs: await recordedRuns() });
}