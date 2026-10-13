'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/mcp', label: 'Generate MCP server' },
  { href: '/projects', label: 'Projects' },
  { href: '/projects/new', label: 'Import OpenAPI' },
  { href: '/runs/new', label: 'Demo runs' },
  { href: '/recorded', label: 'Recorded runs' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/projects')
    return (
      pathname === '/projects' ||
      (pathname.startsWith('/projects/') && pathname !== '/projects/new')
    );
  return pathname.startsWith(href);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  if (pathname === '/') {
    return (
      <>
        <header className="landing-nav">
          <Link href="/" className="brand">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M6 26V14a10 10 0 0 1 20 0v12l-5-3-5 3-5-3-5 3Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 13v4m8-4v4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            GhostQA
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/recorded">Recorded runs</Link>
            <Link href="/mcp" className="nav-cta">
              Generate MCP <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </header>
        {children}
      </>
    );
  }
  return (
    <div className="app-shell flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-line)] px-4 py-3.5">
          <Link href="/" className="block">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
              GhostQA
            </span>
            <span className="mt-0.5 block text-[11px] leading-tight text-[var(--color-ink-faint)]">
              OpenAPI tools and workflow testing
            </span>
          </Link>
        </div>
        <nav
          aria-label="App navigation"
          className="flex flex-1 flex-col gap-0.5 p-2"
        >
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded px-2.5 py-1.5 text-[13px] transition-colors ${
                  active
                    ? 'bg-[var(--color-overlay)] text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-ink)]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-line)] p-3">
          <p className="label mb-1.5">Engine authority</p>
          <p className="text-[11px] leading-snug text-[var(--color-ink-faint)]">
            The model proposes. Deterministic code dispatches, scopes, budgets
            and classifies.
          </p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
      <div className="min-w-0">
        <h1 className="text-[19px] font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
