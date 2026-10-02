'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DemoFixture, DemoFixtureId } from '@/server/demo/contracts';
import { DEMO_LIMITS } from '@/lib/demo-view';
import { Button, Panel, StatusBadge } from './ui';

export function FixturePicker({
  fixtures,
}: {
  fixtures: DemoFixture[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<DemoFixtureId | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fixture: selected }),
      });
      const body = (await response.json()) as {
        run?: { id: string };
        error?: string;
        missing?: string[];
      };
      if (response.status === 409) {
        setError(
          'A supervised run is already active. GhostQA authorizes one at a time.',
        );
        setPending(false);
        return;
      }
      if (!response.ok || !body.run) {
        setError(
          body.missing?.length
            ? `Missing or invalid configuration: ${body.missing.join(', ')}.`
            : 'The run could not be started.',
        );
        setPending(false);
        return;
      }
      router.push(`/runs/${body.run.id}`);
    } catch {
      setError('The run could not be started.');
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        {fixtures.map((fixture) => {
          const active = selected === fixture.id;
          return (
            <button
              key={fixture.id}
              type="button"
              onClick={() => setSelected(fixture.id)}
              aria-pressed={active}
              className={`rounded border px-4 py-3.5 text-left transition-colors ${
                active
                  ? 'border-[var(--color-accent)]/70 bg-[var(--color-raised)]'
                  : 'border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-strong)]'
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-medium text-[var(--color-ink)]">
                  {fixture.name}
                </span>
                <span className="mono text-[10.5px] text-[var(--color-ink-faint)]">
                  {fixture.id}
                </span>
              </span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-[var(--color-ink-muted)]">
                {fixture.tagline}
              </span>
              <span className="mt-2 block text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
                {fixture.description}
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <Panel title="What GhostQA will test">
          <InvariantDetail fixture={fixtures.find((f) => f.id === selected)!} />
        </Panel>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void start()}
          disabled={!selected || pending}
        >
          {pending ? 'Starting…' : 'Run autonomous test'}
        </Button>
        <span className="text-[12px] text-[var(--color-ink-faint)]">
          No configuration required. Budget: {DEMO_LIMITS.requests} target
          requests, {DEMO_LIMITS.journeys} journeys,{' '}
          {Math.round(DEMO_LIMITS.milliseconds / 60000)} minutes.
        </span>
      </div>

      {error ? (
        <div className="rounded border border-[var(--color-bad)]/45 bg-[var(--color-raised)] px-3.5 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12.5px] text-[var(--color-ink-muted)]">{error}</p>
            <StatusBadge tone="bad">unavailable</StatusBadge>
          </div>
          <Link
            href="/recorded"
            className="mt-1.5 inline-block text-[12px] text-[var(--color-accent)] underline"
          >
            Open a recorded run instead
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function InvariantDetail({ fixture }: { fixture: DemoFixture }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="label">Approved invariant</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-ink)]">
          {fixture.invariant}
        </p>
      </div>
      <div>
        <p className="label">Exploration operations the planner may use</p>
        <ul className="mono mt-1 space-y-0.5 text-[11.5px] text-[var(--color-ink-muted)]">
          {fixture.explorationOperations.map((operation) => (
            <li key={operation}>{operation}</li>
          ))}
        </ul>
      </div>
      <p className="text-[12px] leading-relaxed text-[var(--color-ink-faint)]">
        Reset and baseline operations are held by the frozen policy and are never
        exposed to the planner. The target is reset and its baseline verified
        before every trial.
      </p>
    </div>
  );
}