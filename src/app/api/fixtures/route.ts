import { NextResponse } from 'next/server';
import { demoFixtures } from '@/server/demo/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ fixtures: await demoFixtures() });
}