export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell';
import { MetricGrid, ResultHeadline } from '@/components/result';
import { KeyValue, Panel, StatusBadge } from '@/components/ui';
import { RecordedRunIdSchema } from '@/server/demo/contracts';
import {
  readRecordedReport,
  recordedRun,
} from '@/server/demo/recorded';
import { projectReport } from '@/lib/report-view';
import { EvidencePanel, ReportViewer } from '@/components/result';

export const metadata = { title: 'Recorded run · GhostQA' };

export default async function RecordedRunPage({
  params,
}: {
  params: Promise<{ series: string; ordinal: string }>;
}) {
  const { series, ordinal } = await params;
  const parsed = RecordedRunIdSchema.safeParse(`${series}/${ordinal}`);
  if (!parsed.success) notFound();
  const [summary, report] = await Promise.all([
    recordedRun(parsed.data),
    readRecordedReport(parsed.data),
  ]);
  if (!summary) notFound();
  const view = projectReport(report?.json);

  const confirmed =
    summary.discoveryStatus === 'OBSERVED VIOLATION' &&
    summary.confirmationStatus === 'CONFIRMED';

  return (
    <>
      <PageHeader
        title={`Recorded run · ${summary.fixtureId}`}
        description="Previously generated GhostQA evidence committed to this repository. Nothing on this page was executed for this visit."
      />
      <div className="space-y-3 px-6 py-5">
        <ResultHeadline
          tone={confirmed ? 'good' : 'neutral'}
          title={
            confirmed ? 'Violation discovered and confirmed' : 'No confirmed violation'
          }
          detail={
            confirmed
              ? 'This recorded trial autonomously proposed a workflow whose approved invariant was violated, then violated it again from an independently reset fresh state.'
              : `This recorded trial finished as ${summary.discoveryStatus.toLowerCase()}. A run that does not confirm a violation is reported as such, never as a finding.`
          }
          badge={
            <StatusBadge tone={confirmed ? 'good' : 'neutral'}>
              Recorded evidence
            </StatusBadge>
          }
        />

        <MetricGrid
          items={[
            { label: 'Target requests', value: String(summary.requests) },
            { label: 'Model calls', value: String(summary.modelCalls) },
            {
              label: 'Minimized sequence',
              value: summary.minimizedLength === null ? '—' : String(summary.minimizedLength),
              hint: summary.originalLength
                ? `from ${summary.originalLength} steps`
                : 'no sequence',
            },
            { label: 'Variant', value: summary.variant },
          ]}
        />

        <Panel title="Provenance">
          <KeyValue
            items={[
              { label: 'Series', value: summary.seriesId },
              { label: 'Trial ordinal', value: summary.id.split('/')[1] ?? '', mono: false },
              { label: 'Engine run id', value: summary.runId },
              { label: 'Discovery', value: summary.discoveryStatus, mono: false },
              { label: 'Confirmation', value: summary.confirmationStatus, mono: false },
              { label: 'Artifact', value: summary.artifactStatus, mono: false },
              { label: 'Stop reason', value: summary.stopReason, mono: false },
            ]}
          />
        </Panel>

        {view ? <EvidencePanel report={view} /> : null}
        {report?.markdown ? <ReportViewer markdown={report.markdown} /> : null}

        <p className="text-[12px] text-[var(--color-ink-faint)]">
          <Link href="/recorded" className="text-[var(--color-accent)] underline">
            Back to recorded runs
          </Link>
        </p>
      </div>
    </>
  );
}