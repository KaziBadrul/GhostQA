export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { application } from '@/server/application-runtime';
import { DemoRunRecordSchema } from '@/server/demo/contracts';
import { z } from 'zod';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell';
import { RunView } from '@/components/run-view';
import { demoRunDetail } from '@/server/demo/runtime';
import { readDemoReport } from '@/server/demo/store';
import { projectReport } from '@/lib/report-view';

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let [run, report] = await Promise.all([
    demoRunDetail(id),
    readDemoReport(id),
  ]);
  if (!run) {
    try { const result = z.object({run:DemoRunRecordSchema}).parse(await application().command('run',id));run=result.run; } catch { notFound(); }
    try { report=z.object({markdown:z.string(),json:z.unknown()}).parse(await application().command('report',id)); } catch { /* A report is only present after confirmed reproduction. */ }
  }
  const projected = projectReport(report?.json);
  return (
    <>
      <PageHeader
        title="Run"
        description="Stage, budget consumption and finding state as reported by the engine. Stages are emitted by the orchestration layer, not simulated."
      />
      <div className="px-6 py-5">
        <RunView
          initial={run}
          report={
            projected
              ? { report: projected, markdown: report?.markdown ?? '' }
              : null
          }
        />
      </div>
    </>
  );
}