'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type {
  DemoFixture,
  DemoRunRecord,
} from '@/server/demo/contracts';
import { EmptyState, Panel, StatusBadge, type Tone } from './ui';

function outcomeTone(run: DemoRunRecord): Tone {
  if (run.outcome === 'VIOLATION CONFIRMED') return 'good';
  if (run.outcome === 'NO CONFIRMED VIOLATION') return 'warn';
  if (run.state === 'FAILED') return 'bad';
  if (run.state === 'RUNNING' || run.state === 'QUEUED') return 'accent';
  return 'neutral';
}

function formatTime(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NewRunCard({ busy }: { busy: boolean }) {
  return (
    <Link
      href={busy ? '#' : '/runs/new'}
      aria-disabled={busy}
      className={`block rounded border border-[var(--color-line-strong)] bg-[var(--color-raised)] px-4 py-3 transition-colors ${
        busy
          ? 'pointer-events-none opacity-50'
          : 'hover:border-[var(--color-accent)]/60'
      }`}
    >
      <span className="block text-[13.5px] font-medium text-[var(--color-ink)]">
        New test run
      </span>
      <span className="mt-0.5 block text-[12.5px] text-[var(--color-ink-faint)]">
        {busy
          ? 'A supervised run is already active.'
          : 'Start an autonomous test against a local fixture.'}
      </span>
    </Link>
  );
}

export function RunRow({ run }: { run: DemoRunRecord }) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3.5 py-2.5 transition-colors hover:bg-[var(--color-raised)] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]"
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-[var(--color-ink)]">
          {run.fixtureId}
        </span>
        <span className="mono block truncate text-[11px] text-[var(--color-ink-faint)]">
          {run.id}
        </span>
      </span>
      <span className="hidden sm:block">
        <StatusBadge tone={outcomeTone(run)}>{run.outcome}</StatusBadge>
      </span>
      <span className="mono text-[11.5px] text-[var(--color-ink-faint)] tabular-nums">
        {run.counters?.usedRequests ?? 0} req
        {run.counters ? ` · ${run.counters.modelCalls} model` : ''}
      </span>
      <span className="mono text-[11.5px] text-[var(--color-ink-faint)] tabular-nums">
        {formatTime(run.startedAt)}
      </span>
    </Link>
  );
}

function LiveRuns({
  initialRuns,
  initialActiveRunId,
}: {
  initialRuns: DemoRunRecord[];
  initialActiveRunId: string | null;
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [activeRunId, setActiveRunId] = useState(initialActiveRunId);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch('/api/runs', { cache: 'no-store' });
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as {
          runs: DemoRunRecord[];
          activeRunId: string | null;
        };
        if (cancelled) return;
        setRuns(body.runs);
        setActiveRunId(body.activeRunId);
        if (!body.activeRunId) clearInterval(timer);
      } catch {
        /* Transient poll failure leaves the last known list on screen. */
      }
    };
    const timer = setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const busy = activeRunId !== null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <NewRunCard busy={busy} />
        <Link
          href="/recorded"
          className="block rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[var(--color-line-strong)]"
        >
          <span className="block text-[13.5px] font-medium text-[var(--color-ink)]">
            Recorded runs
          </span>
          <span className="mt-0.5 block text-[12.5px] text-[var(--color-ink-faint)]">
            Previously generated GhostQA evidence from this repository.
          </span>
        </Link>
      </div>

      <Panel
        title="Recent runs"
        meta={
          busy ? (
            <StatusBadge tone="accent" pulse>
              supervised run active
            </StatusBadge>
          ) : (
            <span className="text-[11px] text-[var(--color-ink-faint)]">
              one supervised run at a time
            </span>
          )
        }
      >
        {runs.length ? (
          <div className="divide-y divide-[var(--color-line)]">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No runs yet"
            detail="Start a test run to exercise the engine against one of the local fixtures."
            action={<NewRunCard busy={busy} />}
          />
        )}
      </Panel>
    </div>
  );
}

export function Dashboard({
  runs,
  activeRunId,
  fixtures,
  recordedCount,
  recordedConfirmed,
  limits,
}: {
  runs: DemoRunRecord[];
  activeRunId: string | null;
  fixtures: DemoFixture[];
  recordedCount: number;
  recordedConfirmed: number;
  limits: { requests: number; journeys: number; milliseconds: number };
}) {
  const confirmed = runs.filter(
    (run) => run.outcome === 'VIOLATION CONFIRMED',
  ).length;
  return (
    <div className="px-6 py-5">
      <div className="mb-5 grid gap-px overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-4">
        {[
          { label: 'Local runs', value: String(runs.length) },
          { label: 'Violations confirmed', value: String(confirmed) },
          {
            label: 'Recorded trials',
            value: String(recordedCount),
            hint: `${recordedConfirmed} confirmed`,
          },
          {
            label: 'Per-run budget',
            value: String(limits.requests),
            hint: `requests · ${Math.round(limits.milliseconds / 60000)} min`,
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
      <LiveRuns initialRuns={runs} initialActiveRunId={activeRunId} />
      <p className="mt-5 max-w-3xl text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
        Live runs execute the real engine against the selected local fixture with
        the configured Gemini model proposing journeys only. No run may reach
        the target outside the frozen scope, and every request is counted
        against the run budget. {fixtures.length} fixtures are available.
      </p>
    </div>
  );
}