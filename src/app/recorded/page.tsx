export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { PageHeader } from '@/components/shell';
import { Panel, StatusBadge, type Tone } from '@/components/ui';
import { recordedRuns } from '@/server/demo/recorded';

export const metadata = { title: 'Recorded runs · GhostQA' };

function tone(
  discoveryStatus: string,
  confirmationStatus: string,
): Tone {
  if (discoveryStatus === 'OBSERVED VIOLATION' && confirmationStatus === 'CONFIRMED')
    return 'good';
  if (discoveryStatus === 'NOT OBSERVED') return 'neutral';
  return 'warn';
}

export default async function RecordedPage() {
  const runs = await recordedRuns();
  const confirmed = runs.filter(
    (run) =>
      run.discoveryStatus === 'OBSERVED VIOLATION' &&
      run.confirmationStatus === 'CONFIRMED',
  );
  return (
    <>
      <PageHeader
        title="Recorded runs"
        description="Historical Gate 5 acceptance evidence committed to this repository. These are real outputs of real configured-Gemini runs — not live executions, and not newly generated for this page."
      />
      <div className="space-y-4 px-6 py-5">
        <div className="grid gap-px overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3">
          {[
            { label: 'Recorded trials', value: String(runs.length) },
            { label: 'Confirmed findings', value: String(confirmed.length) },
            {
              label: 'Autonomous discovery',
              value: String(
                runs.filter((run) => run.variant === 'faulty').length,
              ),
              hint: 'faulty-variant assignments',
            },
          ].map((item) => (
            <div key={item.label} className="bg-[var(--color-surface)] px-3.5 py-3">
              <p className="label">{item.label}</p>
              <p className="mono mt-1 text-[17px] leading-none text-[var(--color-ink)] tabular-nums">
                {item.value}
              </p>
              {item.hint ? (
                <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                  {item.hint}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <Panel
          title="Evidence index"
          meta={
            <span className="text-[11px] text-[var(--color-ink-faint)]">
              confirmed findings first
            </span>
          }
        >
          {runs.length ? (
            <div className="divide-y divide-[var(--color-line)]">
              {runs.map((run) => (
                <Link
                  key={run.id}
                  href={`/recorded/${run.seriesId}/${Number(run.id.split('/')[1])}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3.5 py-2.5 transition-colors hover:bg-[var(--color-raised)] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-[var(--color-ink)]">
                      {run.fixtureId}
                    </span>
                    <span className="mono block truncate text-[11px] text-[var(--color-ink-faint)]">
                      {run.runId}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <StatusBadge tone={tone(run.discoveryStatus, run.confirmationStatus)}>
                      {run.confirmationStatus}
                    </StatusBadge>
                  </span>
                  <span className="mono text-[11.5px] text-[var(--color-ink-faint)]">
                    {run.variant}
                  </span>
                  <span className="mono text-[11.5px] text-[var(--color-ink-faint)] tabular-nums">
                    {run.requests} req · {run.modelCalls} model
                  </span>
                  <span className="mono text-[11.5px] text-[var(--color-ink-faint)] tabular-nums">
                    {run.minimizedLength ?? '—'} steps
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-[var(--color-ink-faint)]">
              No recorded acceptance evidence is present in this checkout.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}