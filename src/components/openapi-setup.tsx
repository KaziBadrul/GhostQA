'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { appRequest } from '@/lib/application-client';

const PreviewSchema = z.strictObject({
  openapiVersion: z.string(),
  operations: z.array(
    z.strictObject({
      id: z.string(),
      method: z.string(),
      pathTemplate: z.string(),
      eligible: z.boolean(),
      exclusionReasons: z.array(z.string()),
    }),
  ),
  diagnostics: z.array(
    z.strictObject({ operationId: z.string(), reasons: z.array(z.string()) }),
  ),
});
type Preview = z.infer<typeof PreviewSchema>;
const LIMIT = 2 * 1024 * 1024;
export function OpenApiSetup() {
  const router = useRouter();
  const [projectName, setProjectName] = useState('My API');
  const [source, setSource] = useState('');
  const [filename, setFilename] = useState<string>();
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  function update(value: string) {
    revision.current++;
    setSource(value);
    setPreview(undefined);
    setError('');
  }
  async function readFile(file: File) {
    if (!/\.(json|ya?ml)$/i.test(file.name)) {
      setError('Choose a .json, .yaml, or .yml OpenAPI file.');
      return;
    }
    if (file.size > LIMIT) {
      setError('This file exceeds 2 MiB. Choose a smaller specification.');
      return;
    }
    const current = ++revision.current;
    try {
      const text = await file.text();
      if (current !== revision.current) return;
      update(text);
      setFilename(file.name);
    } catch {
      setError('Could not read this file. Try selecting it again.');
    }
  }
  async function validate() {
    setError('');
    setPreview(undefined);
    if (!source.trim()) {
      setError('Upload a specification or paste one below.');
      return;
    }
    if (new TextEncoder().encode(source).length > LIMIT) {
      setError('This document exceeds 2 MiB. Use a smaller specification.');
      return;
    }
    const current = revision.current;
    setBusy(true);
    try {
      const nonceResponse = await fetch('/api/setup', {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      const nonce = z
        .object({ token: z.string() })
        .parse(await nonceResponse.json());
      const response = await fetch('/api/openapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-GhostQA-CSRF': nonce.token,
        },
        body: source,
        signal: AbortSignal.timeout(20000),
      });
      const data: unknown = await response.json();
      if (current !== revision.current) return;
      if (!response.ok) {
        const failure = z.object({ message: z.string() }).safeParse(data);
        throw new Error(
          failure.success
            ? failure.data.message
            : 'Import failed. Please try again.',
        );
      }
      setPreview(PreviewSchema.parse(data));
    } catch (failure) {
      if (current === revision.current)
        setError(
          failure instanceof Error && failure.name === 'Error'
            ? failure.message
            : 'Could not validate this document. Check the connection and try again.',
        );
    } finally {
      setBusy(false);
    }
  }
  const operations =
    preview?.operations.filter((op) =>
      `${op.method} ${op.pathTemplate} ${op.id}`
        .toLowerCase()
        .includes(filter.toLowerCase()),
    ) ?? [];
  return (
    <main className="setup-page">
      <div className="setup-heading">
        <h1>Bring your API.</h1>
        <p>
          Upload or paste your OpenAPI specification. GhostQA will validate the
          contract and show which operations it can explore.
        </p>
      </div>
      <div className="setup-layout">
        <section aria-label="Import specification" className="setup-editor">
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void readFile(file);
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
            </svg>
            <h2>{filename ?? 'Drop your OpenAPI file here'}</h2>
            <p>JSON or YAML · OpenAPI 3.0 / 3.1 · Up to 2 MiB</p>
            <button
              type="button"
              className="landing-secondary"
              onClick={() => input.current?.click()}
            >
              Choose a file
            </button>
            <input
              ref={input}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept=".json,.yaml,.yml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file);
                event.target.value = '';
              }}
            />
          </div>
          <label className="source-label" htmlFor="openapi-source">
            Or paste your specification
          </label>
          <textarea
            id="openapi-source"
            spellCheck={false}
            value={source}
            onChange={(event) => {
              setFilename(undefined);
              update(event.target.value);
            }}
            placeholder={
              'openapi: 3.1.0\ninfo:\n  title: My API\n  version: 1.0.0\npaths:\n  ...'
            }
            aria-describedby="source-help"
          />
          <div className="source-toolbar">
            <p id="source-help">
              Local references only. Nothing is sent to your API.
            </p>
            <button
              className="landing-primary"
              disabled={busy || !source.trim()}
              onClick={() => void validate()}
            >
              {busy ? 'Validating…' : 'Validate specification'}
            </button>
          </div>
          {error && (
            <p className="setup-error" role="alert">
              {error}
            </p>
          )}
        </section>
        <aside className="setup-guide">
          <h2>What happens next?</h2>
          <a className="text-action" href="/api/example" download>
            Download example OpenAPI
          </a>
          <ol>
            <li>
              <strong>Import and inspect</strong>
              <p>
                Review the endpoints and unsupported operations in your
                contract.
              </p>
            </li>
            <li>
              <strong>Configure a fresh-state test</strong>
              <p>
                A run needs a target URL, reset and baseline checks, an approved
                invariant, and finite limits.
              </p>
            </li>
            <li>
              <strong>Approve and explore</strong>
              <p>Review the network scope before requests can execute.</p>
            </li>
          </ol>
          <div className="setup-availability">
            <h3>Available in this build</h3>
            <p>
              Custom specifications can be validated, saved, and configured
              here. Saving projects and running custom targets are not connected
              yet.
            </p>
            <Link href="/runs/new">
              Run a bundled demo <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </aside>
      </div>
      {preview && (
        <section className="endpoint-review" aria-label="Imported endpoints">
          <div className="endpoint-heading">
            <div>
              <h2>API operations</h2>
              <p role="status">
                OpenAPI {preview.openapiVersion} ·{' '}
                {preview.operations.filter((op) => op.eligible).length}{' '}
                supported ·{' '}
                {preview.operations.filter((op) => !op.eligible).length}{' '}
                excluded
              </p>
            </div>
            <label>
              Filter operations
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search paths or methods"
              />
            </label>
          </div>
          <div className="endpoint-table">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path / operation</th>
                  <th>Import status</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <tr key={op.id}>
                    <td>
                      <code className="method">{op.method}</code>
                    </td>
                    <td>
                      <code>{op.pathTemplate}</code>
                      <small>{op.id}</small>
                    </td>
                    <td>
                      <span className={op.eligible ? 'supported' : 'excluded'}>
                        {op.eligible ? 'Supported' : 'Excluded'}
                      </span>
                      {op.exclusionReasons.map((reason) => (
                        <small key={reason}>{reason}</small>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {operations.length === 0 && (
            <p className="empty-operations">
              {preview.operations.length === 0
                ? 'No operations found in this document. Add paths and import again.'
                : 'No operations match this filter.'}
            </p>
          )}
          <div className="save-project-form">
            <label>
              Project name
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                maxLength={100}
              />
            </label>
            <button
              className="landing-primary"
              disabled={busy || !projectName.trim()}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const created = (await appRequest('/api/projects', 'POST', {
                      name: projectName,
                      targetTemplate: {},
                    })) as { project: { id: string } };
                    await appRequest(
                      `/api/projects/${created.project.id}/specifications`,
                      'POST',
                      source,
                      true,
                    );
                    router.push(`/projects/${created.project.id}`);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : 'Could not save project.',
                    );
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Save project and configure
            </button>
          </div>
          <p className="review-note">
            Import support does not authorize execution. Reset, baseline,
            exploration, and exclusions must be classified before a custom run.
          </p>
        </section>
      )}
    </main>
  );
}
