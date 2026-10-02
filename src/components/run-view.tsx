'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  DemoRunRecord,
  DemoStage,
} from '@/server/demo/contracts';
import {
  DEMO_LIMITS,
  DEMO_PIPELINE_STAGES,
  DEMO_STAGE_LABELS,
} from '@/lib/demo-view';
import { projectReport, type ReportView } from '@/lib/report-view';
import { EvidencePanel, MetricGrid, ReportViewer, ResultHeadline } from './result';
import { Button, KeyValue, Panel, StatusBadge, type Tone } from './ui';

const SKIPPED: DemoStage[] = ['QUEUED', 'FAILED'];

function toneForOutcome(outcome: DemoRunRecord['outcome']): Tone {
  if (outcome === 'VIOLATION CONFIRMED') return 'good';
  if (outcome === 'NO CONFIRMED VIOLATION') return 'warn';
  return 'neutral';
}

function headlineFor(run: DemoRunRecord) {
  if (run.state === 'FAILED')
    return {
      tone: 'bad' as Tone,
      title: 'Run did not complete',
      detail:
        run.failure?.detail ??
        'The engine stopped before a determination could be made.',
    };
  if (run.state !== 'SUCCEEDED')
    return {
      tone: 'accent' as Tone,
      title: 'Autonomous test in progress',
      detail:
        'GhostQA is planning and executing trials against a freshly reset target. Stages below are reported by the engine as they occur.',
    };
  if (run.outcome === 'VIOLATION CONFIRMED')
    return {
      tone: 'good' as Tone,
      title: 'Violation discovered and confirmed',
      detail:
        'Gemini proposed a valid but unusual workflow. The approved invariant was observed violated, then violated again from an independently reset fresh state, and the sequence was minimized.',
    };
  if (run.outcome === 'NO CONFIRMED VIOLATION')
    return {
      tone: 'warn' as Tone,
      title: 'No confirmed violation',
      detail:
        'The run finished within budget without a confirmed reproduction. An unconfirmed observation is reported as such and never promoted to a finding.',
    };
  return {
    tone: 'neutral' as Tone,
    title: 'No determination',
    detail:
      'The run finished but the predicate could not be evaluated to a classification.',
  };
}

function formatElapsed(run: DemoRunRecord, now: number) {
  const start = Date.parse(run.startedAt);
  if (Number.isNaN(start)) return '—';
  const end = run.finishedAt ? Date.parse(run.finishedAt) : now;
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Wall-clock reading is state, not a render-time call: an active run has no
// fixed elapsed time, so the polling tick that refreshes the run also advances
// the clock. `null` before the first tick renders as an em dash.
function useTicker(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export function StageList({
  current,
  state,
}: {
  current: DemoStage;
  state: DemoRunRecord['state'];
}) {
  const stages = useMemo(
    () => DEMO_PIPELINE_STAGES.filter((stage) => !SKIPPED.includes(stage)),
    [],
  );
  const failed = state === 'FAILED';
  const index = stages.indexOf(current);
  return (
    <ol className="space-y-0">
      {stages.map((stage, position) => {
        const done = !failed && index >= 0 && position < index;
        const active = !failed && current === stage && state !== 'SUCCEEDED';
        const settled = !failed && state === 'SUCCEEDED';
        const label = DEMO_STAGE_LABELS[stage] ?? stage;
        return (
          <li key={stage} className="flex items-center gap-2.5 py-1">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                active
                  ? 'live-dot bg-[var(--color-accent)]'
                  : done || settled
                    ? 'bg-[var(--color-good)]'
                    : 'bg-[var(--color-line-strong)]'
              }`}
            />
            <span
              className={`text-[12.5px] ${
                active
                  ? 'font-medium text-[var(--color-ink)]'
                  : done || settled
                    ? 'text-[var(--color-ink-muted)]'
                    : 'text-[var(--color-ink-faint)]'
              }`}
            >
              {label}
            </span>
            {active ? (
              <span className="mono ml-auto text-[11px] text-[var(--color-accent)]">
                in progress
              </span>
            ) : null}
          </li>
        );
      })}
      {failed ? (
        <li className="flex items-center gap-2.5 py-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-bad)]" />
          <span className="text-[12.5px] font-medium text-[var(--color-bad)]">
            Stopped
          </span>
        </li>
      ) : null}
    </ol>
  );
}

export function RunProgressPanel({ run }: { run: DemoRunRecord }) {
  const headline = headlineFor(run);
  const counters = run.counters;
  const phase = counters?.requestsByPhase ?? {};
  const active = run.state === 'RUNNING' || run.state === 'QUEUED';
  const now = useTicker(active);
  return (
    <div className="space-y-3">
      <ResultHeadline
        tone={headline.tone}
        title={headline.title}
        detail={headline.detail}
        badge={
          run.failure ? (
            <StatusBadge tone="bad">{run.failure.code}</StatusBadge>
          ) : (
            <StatusBadge
              tone={run.state === 'RUNNING' ? 'accent' : 'neutral'}
              pulse={run.state === 'RUNNING' || run.state === 'QUEUED'}
            >
              {run.state}
            </StatusBadge>
          )
        }
      />
      <MetricGrid
        items={[
          {
            label: 'Target requests',
            value: String(counters?.usedRequests ?? 0),
            hint: `budget ${DEMO_LIMITS.requests}`,
          },
          {
            label: 'Model calls',
            value: String(counters?.modelCalls ?? 0),
            hint: 'proposal only',
          },
          {
            label: 'Journeys tried',
            value: String(counters?.usedExplorationJourneys ?? 0),
            hint: `limit ${DEMO_LIMITS.journeys}`,
          },
          {
            label: 'Elapsed',
            value: run.finishedAt
              ? formatElapsed(run, Date.parse(run.finishedAt))
              : now === null
                ? '—'
                : formatElapsed(run, now),
            hint: `deadline ${Math.round(DEMO_LIMITS.milliseconds / 60000)} min`,
          },
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Stage">
          <StageList current={run.stage} state={run.state} />
        </Panel>
        <Panel title="Run facts">
          <KeyValue
            items={[
              { label: 'Fixture', value: run.fixtureId, mono: false },
              { label: 'Run id', value: run.id },
              { label: 'Started', value: run.startedAt },
              {
                label: 'Stop reason',
                value: run.stopReason ?? '—',
                mono: false,
              },
              {
                label: 'Requests by phase',
                value:
                  Object.keys(phase).length
                    ? Object.entries(phase)
                        .filter(([, count]) => count > 0)
                        .map(([name, count]) => `${name.toLowerCase()} ${count}`)
                        .join(' · ')
                    : 'none yet',
                mono: false,
              },
            ]}
          />
        </Panel>
      </div>
      {run.finding ? (
        <Panel title="Finding">
          <KeyValue
            items={[
              { label: 'Classification', value: run.finding.classification, mono: false },
              { label: 'Invariant', value: run.finding.predicateSourceRef, mono: false },
              {
                label: 'Sequence length',
                value:
                  run.finding.originalLength !== null
                    ? `${run.finding.originalLength} → ${run.finding.minimizedLength ?? '—'} steps`
                    : 'not minimized',
                mono: false,
              },
              {
                label: 'Regression artifact',
                value: run.finding.artifactStatus ?? 'not generated',
                mono: false,
              },
              { label: 'Finding id', value: run.finding.id },
            ]}
          />
        </Panel>
      ) : null}
    </div>
  );
}

export interface InitialReport {
  report: ReportView;
  markdown: string;
}

// A completed run's evidence is server-rendered on first paint. A run that is
// still executing has nothing to show yet, so the section fetches once when the
// engine reports that the report exists.
export function RunReportSection({
  id,
  initial,
  available,
}: {
  id: string;
  initial: InitialReport | null;
  available: boolean;
}) {
  const [fetched, setFetched] = useState<InitialReport | null>(null);
  const [absent, setAbsent] = useState(false);
  const report = initial ?? fetched;

  useEffect(() => {
    if (report || !available) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/runs/${id}/report`, {
          cache: 'no-store',
        });
        if (cancelled) return;
        if (!response.ok) {
          setAbsent(true);
          return;
        }
        const body = (await response.json()) as {
          markdown?: string;
          json?: unknown;
        };
        const projected = projectReport(body.json);
        if (cancelled) return;
        if (projected)
          setFetched({ report: projected, markdown: String(body.markdown ?? '') });
        else setAbsent(true);
      } catch {
        if (!cancelled) setAbsent(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available, id, report]);

  if (report)
    return (
      <div className="space-y-3">
        <EvidencePanel report={report.report} />
        {report.markdown ? <ReportViewer markdown={report.markdown} /> : null}
      </div>
    );
  if (absent)
    return (
      <p className="text-[12.5px] text-[var(--color-ink-faint)]">
        No finding evidence was produced for this run.
      </p>
    );
  if (available)
    return (
      <p className="text-[12.5px] text-[var(--color-ink-faint)]">
        Loading evidence…
      </p>
    );
  return null;
}

export function RunView({
  initial,
  report: initialReport,
}: {
  initial: DemoRunRecord;
  report: InitialReport | null;
}) {
  const [run, setRun] = useState(initial);
  const active = run.state === 'QUEUED' || run.state === 'RUNNING';

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/runs/${initial.id}`, {
            cache: 'no-store',
          });
          if (!response.ok || cancelled) return;
          const body = (await response.json()) as { run?: DemoRunRecord };
          if (body.run && !cancelled) setRun(body.run);
        } catch {
          /* A transient poll failure is not a run failure. */
        }
      })();
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, initial.id]);

  const headline = headlineFor(run);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[19px] font-semibold tracking-tight text-[var(--color-ink)]">
            {run.fixtureId}
          </h1>
          <p className="mono mt-0.5 text-[11px] text-[var(--color-ink-faint)]">
            run {run.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={toneForOutcome(run.outcome)}>{run.outcome}</StatusBadge>
          <Link href="/">
            <Button type="button">Back to dashboard</Button>
          </Link>
        </div>
      </div>
      <RunProgressPanel run={run} />
      <RunReportSection
        id={run.id}
        initial={initialReport}
        available={run.state === 'SUCCEEDED' && run.reportAvailable}
      />
      {headline.tone === 'bad' && run.failure ? (
        <Panel title="Why the run stopped">
          <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
            {run.failure.detail} Engine stop reason:{' '}
            <span className="mono">{run.stopReason ?? run.failure.code}</span>. A
            failed request is an execution outcome, never a product bug, so no
            finding was recorded.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}