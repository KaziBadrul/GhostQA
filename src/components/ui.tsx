import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent';

const TONE: Record<Tone, string> = {
  neutral: 'border-[var(--color-line-strong)] text-[var(--color-ink-muted)]',
  good: 'border-[var(--color-good)]/45 text-[var(--color-good)]',
  warn: 'border-[var(--color-warn)]/45 text-[var(--color-warn)]',
  bad: 'border-[var(--color-bad)]/45 text-[var(--color-bad)]',
  accent: 'border-[var(--color-accent)]/45 text-[var(--color-accent)]',
};

export function StatusBadge({
  tone = 'neutral',
  children,
  pulse = false,
}: {
  tone?: Tone;
  children: ReactNode;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase ${TONE[tone]}`}
    >
      {pulse ? (
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}

export function Panel({
  title,
  meta,
  children,
  className = '',
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title ? (
        <header className="panel-header">
          <h2 className="text-[12px] font-semibold tracking-[0.04em] text-[var(--color-ink)] uppercase">
            {title}
          </h2>
          {meta}
        </header>
      ) : null}
      <div className="p-3.5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded border border-dashed border-[var(--color-line-strong)] px-5 py-8 text-center">
      <p className="text-[13px] font-medium text-[var(--color-ink)]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-[var(--color-ink-faint)]">
        {detail}
      </p>
      {action ? <div className="mt-3.5">{action}</div> : null}
    </div>
  );
}

export function KeyValue({
  items,
}: {
  items: { label: string; value: ReactNode; mono?: boolean }[];
}) {
  return (
    <dl className="divide-y divide-[var(--color-line)]">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-3 py-1.5"
        >
          <dt className="label pt-0.5">{item.label}</dt>
          <dd
            className={
              item.mono === false
                ? 'min-w-0 break-words text-[12.5px] text-[var(--color-ink)]'
                : 'mono min-w-0 break-all text-[var(--color-ink)]'
            }
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Button({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`rounded border border-[var(--color-line-strong)] bg-[var(--color-overlay)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-faint)] disabled:cursor-not-allowed disabled:opacity-45 ${rest.className ?? ''}`}
    >
      {children}
    </button>
  );
}