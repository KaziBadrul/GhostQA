import type { ReactNode } from 'react';
import { KeyValue, Panel, StatusBadge, type Tone } from './ui';
import type { ReportStep, ReportTrial, ReportView } from '@/lib/report-view';

export function ResultHeadline({
  tone,
  title,
  detail,
  badge,
}: {
  tone: Tone;
  title: string;
  detail: string;
  badge?: ReactNode;
}) {
  const accent =
    tone === 'good'
      ? 'border-[var(--color-good)]/40'
      : tone === 'bad'
        ? 'border-[var(--color-bad)]/40'
        : 'border-[var(--color-line-strong)]';
  const textTone =
    tone === 'good'
      ? 'text-[var(--color-good)]'
      : tone === 'bad'
        ? 'text-[var(--color-bad)]'
        : tone === 'warn'
          ? 'text-[var(--color-warn)]'
          : 'text-[var(--color-ink)]';
  return (
    <div className={`rounded border ${accent} bg-[var(--color-raised)] px-5 py-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`text-[20px] leading-tight font-semibold tracking-tight ${textTone}`}
        >
          {title}
        </p>
        {badge}
      </div>
      <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        {detail}
      </p>
    </div>
  );
}

export function MetricGrid({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-[var(--color-surface)] px-3 py-2.5">
          <p className="label">{item.label}</p>
          <p className="mono mt-1 text-[15px] leading-none text-[var(--color-ink)] tabular-nums">
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StepTable({ steps }: { steps: ReportStep[] }) {
  if (!steps.length)
    return (
      <p className="text-[12.5px] text-[var(--color-ink-faint)]">
        No recorded observations.
      </p>
    );
  return (
    <ol className="space-y-2">
      {steps.map((step, index) => (
        <li
          key={`${step.id}-${index}`}
          className="rounded border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-2.5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="flex items-baseline gap-2">
              <span className="mono w-5 shrink-0 text-[var(--color-ink-faint)] tabular-nums">
                {index + 1}
              </span>
              <span className="mono text-[var(--color-ink)]">{step.operationId}</span>
            </span>
            <span className="flex items-center gap-2">
              {step.url ? (
                <span className="mono text-[11px] text-[var(--color-ink-faint)]">
                  {step.url}
                </span>
              ) : null}
              {step.status !== null ? (
                <StatusBadge tone={step.status < 400 ? 'good' : 'warn'}>
                  {step.status}
                </StatusBadge>
              ) : null}
              {step.elapsedMs !== null ? (
                <span className="mono text-[11px] text-[var(--color-ink-faint)] tabular-nums">
                  {step.elapsedMs} ms
                </span>
              ) : null}
            </span>
          </div>
          {step.response ? (
            <pre className="mono mt-2 overflow-x-auto rounded bg-[var(--color-overlay)] px-2.5 py-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
              {step.response}
              {step.truncated ? '\n… truncated by response size limit' : ''}
            </pre>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Trial({ trial }: { trial: ReportTrial }) {
  const violated = trial.outcome === 'VIOLATED';
  return (
    <div className="rounded border border-[var(--color-line)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-3 py-2">
        <span className="text-[12.5px] font-medium text-[var(--color-ink)]">
          {trial.label}
        </span>
        <span className="flex items-center gap-2">
          <StatusBadge tone="neutral">baseline {trial.baselineVerdict}</StatusBadge>
          <StatusBadge tone={violated ? 'bad' : 'good'}>{trial.outcome}</StatusBadge>
        </span>
      </div>
      <div className="space-y-2 p-3">
        <StepTable steps={trial.steps} />
        <p className="mono text-[11px] text-[var(--color-ink-faint)]">
          trial {trial.trialId} · evidence {trial.evidenceId}
        </p>
      </div>
    </div>
  );
}

export function EvidencePanel({ report }: { report: ReportView }) {
  return (
    <div className="space-y-3">
      <Panel title="Predicate under test">
        <KeyValue
          items={[
            { label: 'Statement', value: report.predicateSourceRef, mono: false },
            { label: 'Provenance', value: `${report.predicateSource} · eligible: ${report.predicateEligible ? 'yes' : 'no'}`, mono: false },
            { label: 'Canonical hash', value: report.predicateHash },
          ]}
        />
        {report.predicateAssertions.length ? (
          <div className="mt-3">
            <p className="label mb-1.5">Assertions</p>
            <ul className="space-y-1">
              {report.predicateAssertions.map((assertion, index) => (
                <li
                  key={index}
                  className="mono overflow-x-auto rounded bg-[var(--color-canvas)] px-2.5 py-1.5 text-[11.5px] text-[var(--color-ink-muted)]"
                >
                  {assertion}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Request sequence"
        meta={
          <span className="mono text-[11px] text-[var(--color-ink-faint)]">
            {report.originalLength} steps → {report.bestLength} steps
          </span>
        }
      >
        <p className="mb-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink-faint)]">
          {report.reproductionClaim}.{' '}
          {report.locallyIrreducible
            ? 'Locally irreducible under the attempted deletion strategy — not a claim of global minimality.'
            : 'Further reduction was not attempted after the recorded stop reason.'}
        </p>
        <StepTable
          steps={report.trials[0]?.steps.slice(0, report.bestLength) ?? []}
        />
      </Panel>

      <Panel
        title="Finding state machine"
        meta={
          <StatusBadge tone={report.consistent ? 'good' : 'warn'}>
            {report.classification}
          </StatusBadge>
        }
      >
        <ol className="space-y-1.5">
          {report.transitions.map((transition, index) => (
            <li
              key={index}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12.5px]"
            >
              <span className="mono text-[var(--color-ink)]">
                {transition.prior ?? 'created'}
              </span>
              <span className="text-[var(--color-ink-faint)]">→</span>
              <span className="mono text-[var(--color-accent)]">{transition.next}</span>
              <span className="text-[var(--color-ink-faint)]">
                · {transition.reason}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      {report.trials.length ? (
        <Panel title="Independent fresh-state replays">
          <div className="space-y-3">
            {report.trials.map((trial, index) => (
              <Trial key={`${trial.trialId}-${index}`} trial={trial} />
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

export function ReportViewer({ markdown }: { markdown: string }) {
  return (
    <Panel
      title="Finding report (Markdown)"
      meta={
        <span className="mono text-[11px] text-[var(--color-ink-faint)]">
          generated by the engine
        </span>
      }
    >
      <div className="prose-report max-h-[32rem] overflow-auto rounded bg-[var(--color-canvas)] p-3">
        {markdown}
      </div>
    </Panel>
  );
}