'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { appRequest } from '@/lib/application-client';
import { z } from 'zod';
const List = z.object({
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      draft: z.object({ targetUrl: z.string().optional() }).nullable(),
    }),
  ),
});
export function ProjectList() {
  const [data, setData] = useState<z.infer<typeof List>>();
  const [error, setError] = useState('');
  useEffect(() => {
    void appRequest('/api/projects')
      .then((value) => setData(List.parse(value)))
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Could not load projects.'),
      );
  }, []);
  return (
    <main className="setup-page">
      <div className="project-title">
        <div>
          <h1>Your projects</h1>
          <p>Saved API contracts, setup, and test history.</p>
        </div>
        <Link href="/projects/new" className="landing-primary">
          Import OpenAPI
        </Link>
      </div>
      {error && (
        <p role="alert" className="setup-error">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Loading projects…</p>}
      {data?.projects.length === 0 && (
        <div className="project-empty">
          <h2>Your first API starts here.</h2>
          <p>
            Import an OpenAPI specification, configure fresh-state checks,
            approve an invariant, then start a bounded run.
          </p>
          <Link href="/projects/new">Create your first project</Link>
        </div>
      )}
      <div className="project-rows">
        {data?.projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <strong>{p.name}</strong>
            <span>{p.draft?.targetUrl ?? 'Target not configured'}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
