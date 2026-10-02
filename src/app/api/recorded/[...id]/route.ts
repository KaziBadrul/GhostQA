import { NextResponse } from 'next/server';
import { RecordedRunIdSchema } from '@/server/demo/contracts';
import {
  readRecordedReport,
  recordedRun,
} from '@/server/demo/recorded';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unknown = () => NextResponse.json({ error: 'UNKNOWN RUN' }, { status: 404 });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string[] }> },
) {
  const { id } = await context.params;
  const wantsReport = id.length === 3 && id[2] === 'report';
  if (id.length !== 2 && !wantsReport) return unknown();
  const parsed = RecordedRunIdSchema.safeParse(`${id[0]}/${id[1]}`);
  if (!parsed.success) return unknown();
  if (!wantsReport) {
    const run = await recordedRun(parsed.data);
    return run ? NextResponse.json({ run }) : unknown();
  }
  const report = await readRecordedReport(parsed.data);
  return report ? NextResponse.json(report) : unknown();
}