'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { appRequest } from '@/lib/application-client';
import {
  NotesSchema,
  originalImportantNotes,
  type ImportantNotes,
} from '@/server/mcp/contracts';
const PreviewSchema = z.object({
  operations: z.array(
    z.object({
      id: z.string(),
      method: z.string(),
      path: z.string(),
      reasons: z.array(z.string()),
    }),
  ),
});
type Operation = z.infer<typeof PreviewSchema>['operations'][number];
async function mcpRequest(path: '/api/mcp' | '/api/mcp/notes', value: unknown) {
  const nonceResponse = await fetch('/api/setup', { cache: 'no-store' });
  if (!nonceResponse.ok)
    throw new Error('Open GhostQA locally and refresh this page.');
  const nonce = z
    .object({ token: z.string() })
    .parse(await nonceResponse.json());
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GhostQA-CSRF': nonce.token,
    },
    body: JSON.stringify(value),
    signal: AbortSignal.timeout(45000),
  };
  const response =
    path === '/api/mcp'
      ? await fetch('/api/mcp', options)
      : await fetch('/api/mcp/notes', options);
  if (!response.ok) {
    const error = z
      .object({ message: z.string() })
      .safeParse(await response.json());
    throw new Error(
      error.success ? error.data.message : 'Request failed. Try again.',
    );
  }
  return response;
}
export function McpWizard({ projectId }: { projectId?: string }) {
  const [source, setSource] = useState('');
  const [name, setName] = useState('My API');
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:4010');
  const [operations, setOperations] = useState<Operation[]>();
  const [selected, setSelected] = useState<string[]>([]);
  const [auth, setAuth] = useState<'none' | 'bearer' | 'apiKey'>('none');
  const [header, setHeader] = useState('X-API-Key');
  const [originalNotes, setOriginalNotes] = useState('');
  const [notes, setNotes] = useState<ImportantNotes>([]);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [savedId, setSavedId] = useState(projectId);
  const [downloaded, setDownloaded] = useState(false);
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    void appRequest(`/api/projects/${projectId}`)
      .then((value) => {
        const project = z
          .object({
            project: z.object({
              name: z.string(),
              draft: z.object({ targetUrl: z.string().optional() }),
            }),
          })
          .parse(value).project;
        if (active) {
          setName(project.name);
          if (project.draft.targetUrl) setBaseUrl(project.draft.targetUrl);
        }
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Could not load project.',
          );
      });
    return () => {
      active = false;
    };
  }, [projectId]);
  async function perform(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError('');
    setStatus('');
    try {
      await action();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Request failed. Try again.',
      );
    } finally {
      setBusy('');
    }
  }
  const inputSource = projectId ? { projectId } : { source };
  const supported = operations?.filter((op) => !op.reasons.length) ?? [];
  return (
    <main className="setup-page mcp-page">
      <div className="setup-heading">
        <p className="label">OpenAPI → MCP · Local stdio</p>
        <h1>Turn your API into tools.</h1>
        <p>
          Upload a contract, select endpoints, review your notes, and download a
          server your app’s backend can launch.
        </p>
      </div>
      <form onSubmit={(event) => event.preventDefault()}>
        <fieldset disabled={Boolean(busy)} className="mcp-fieldset">
          <section className="mcp-section" aria-labelledby="mcp-import-heading">
            <h2 id="mcp-import-heading">1. Import and configure</h2>
            <div className="mcp-fields">
              <label>
                Server / project name
                <input
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label>
                API base URL
                <input
                  type="url"
                  value={baseUrl}
                  maxLength={2048}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  required
                  aria-describedby="base-help"
                />
              </label>
            </div>
            <p id="base-help">
              Endpoint paths are appended to this URL. The Orders example uses{' '}
              <code>http://127.0.0.1:4010</code>; its paths already include{' '}
              <code>/api</code>. No API requests occur during generation.
            </p>
            {projectId ? (
              <p>
                Using the saved project specification.{' '}
                <Link href={`/projects/${projectId}`}>Open project</Link>
              </p>
            ) : (
              <>
                <label>
                  OpenAPI JSON or YAML file
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void perform('Reading file', async () => {
                        if (
                          !/\.(json|ya?ml)$/i.test(file.name) ||
                          file.size > 2 * 1024 * 1024
                        )
                          throw new Error(
                            'Choose a JSON/YAML file up to 2 MiB.',
                          );
                        setSource(await file.text());
                        setOperations(undefined);
                        setSelected([]);
                        setSavedId(undefined);
                        setDownloaded(false);
                      });
                      event.target.value = '';
                    }}
                  />
                </label>
                <label>
                  Or paste your specification
                  <textarea
                    rows={8}
                    value={source}
                    spellCheck={false}
                    maxLength={2 * 1024 * 1024}
                    onChange={(e) => {
                      setSource(e.target.value);
                      setOperations(undefined);
                      setSelected([]);
                      setSavedId(undefined);
                      setDownloaded(false);
                    }}
                  />
                </label>
              </>
            )}
            <div className="mcp-actions">
              <button
                className="landing-primary"
                type="button"
                disabled={!projectId && !source.trim()}
                onClick={() =>
                  void perform('Inspecting endpoints', async () => {
                    const response = await mcpRequest('/api/mcp', {
                      action: 'preview',
                      ...inputSource,
                    });
                    const preview = PreviewSchema.parse(await response.json());
                    setOperations(preview.operations);
                    setSelected(
                      preview.operations
                        .filter(
                          (op) => !op.reasons.length && op.method === 'GET',
                        )
                        .map((op) => op.id),
                    );
                    setDownloaded(false);
                    setStatus(
                      'Endpoints inspected. Supported GET tools are selected initially.',
                    );
                  })
                }
              >
                Inspect endpoints
              </button>
              <a href="/api/example" download>
                Download Orders specification
              </a>
            </div>
            <p>
              OpenAPI 3.0/3.1 · JSON/YAML · Local references · Up to 2 MiB.{' '}
              <Link href="/projects">Use a saved project</Link>
            </p>
          </section>
          {operations && (
            <section
              className="mcp-section"
              aria-labelledby="mcp-tools-heading"
            >
              <h2 id="mcp-tools-heading">2. Select tools and authentication</h2>
              <p>
                {selected.length} selected · {supported.length} supported ·{' '}
                {operations.length - supported.length} unsupported. Select each
                mutation explicitly.
              </p>
              <div className="endpoint-table">
                <table>
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Endpoint</th>
                      <th>Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((op) => (
                      <tr key={op.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${op.id}`}
                            disabled={Boolean(op.reasons.length)}
                            checked={selected.includes(op.id)}
                            onChange={(e) => {
                              setSelected(
                                e.target.checked
                                  ? [...selected, op.id]
                                  : selected.filter((id) => id !== op.id),
                              );
                              setDownloaded(false);
                            }}
                          />
                        </td>
                        <td>
                          <code>
                            {op.method} {op.path}
                          </code>
                          {op.method !== 'GET' && op.method !== 'HEAD' && (
                            <small>Mutation / side effect</small>
                          )}
                        </td>
                        <td>
                          {op.reasons.length
                            ? op.reasons.map((reason) => (
                                <small key={reason}>{reason}</small>
                              ))
                            : 'Supported'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!operations.length && (
                <p>No endpoints found. Import a contract with paths.</p>
              )}
              <div className="mcp-fields">
                <label>
                  Authentication
                  <select
                    value={auth}
                    onChange={(e) => setAuth(e.target.value as typeof auth)}
                  >
                    <option value="none">No authentication</option>
                    <option value="bearer">Bearer token</option>
                    <option value="apiKey">API key header</option>
                  </select>
                </label>
                {auth === 'apiKey' && (
                  <label>
                    API key header name
                    <input
                      value={header}
                      maxLength={64}
                      onChange={(e) => setHeader(e.target.value)}
                    />
                  </label>
                )}
              </div>
              <p>
                {auth === 'none'
                  ? 'No credentials required.'
                  : auth === 'bearer'
                    ? 'The server reads API_BEARER_TOKEN from its environment.'
                    : 'The server reads API_KEY from its environment.'}{' '}
                Enter credentials only in your downloaded server’s private
                environment file.
              </p>
              {!projectId && (
                <button
                  type="button"
                  className="landing-secondary"
                  disabled={Boolean(savedId) || !name.trim()}
                  onClick={() =>
                    void perform('Saving project', async () => {
                      const created = z
                        .object({ project: z.object({ id: z.string() }) })
                        .parse(
                          await appRequest('/api/projects', 'POST', {
                            name,
                            targetTemplate: {},
                          }),
                        );
                      await appRequest(
                        `/api/projects/${created.project.id}/specifications`,
                        'POST',
                        source,
                        true,
                      );
                      setSavedId(created.project.id);
                      setStatus(
                        'Specification saved. MCP configuration stays in this wizard.',
                      );
                    })
                  }
                >
                  {savedId ? 'Project saved' : 'Save specification as project'}
                </button>
              )}
              {savedId && (
                <p>
                  <Link href={`/projects/${savedId}/mcp`}>
                    Generate again from saved project
                  </Link>
                </p>
              )}
            </section>
          )}
          <section className="mcp-section" aria-labelledby="mcp-notes-heading">
            <h2 id="mcp-notes-heading">3. Review documentation notes</h2>
            <label>
              Original notes
              <textarea
                rows={4}
                value={originalNotes}
                maxLength={16000}
                onChange={(e) => {
                  setOriginalNotes(e.target.value);
                  setNotes([]);
                  setApproved(false);
                  setDownloaded(false);
                }}
                aria-describedby="notes-help"
              />
            </label>
            <p id="notes-help">
              Documentation only. Do not include secrets. Processing sends these
              notes to your configured Gemini model; review the result before
              exporting.
            </p>
            <div className="mcp-actions">
              <button
                type="button"
                className="landing-secondary"
                disabled={!originalNotes.trim()}
                onClick={() =>
                  void perform('Processing notes', async () => {
                    const result = z
                      .object({
                        importantNotes: NotesSchema,
                        message: z.string(),
                      })
                      .parse(
                        await (
                          await mcpRequest('/api/mcp/notes', {
                            notes: originalNotes,
                          })
                        ).json(),
                      );
                    setNotes(result.importantNotes);
                    setApproved(false);
                    setStatus(result.message);
                  })
                }
              >
                Process with Gemini
              </button>
              <button
                type="button"
                className="text-action"
                disabled={!originalNotes.trim()}
                onClick={() => {
                  setNotes(originalImportantNotes(originalNotes));
                  setApproved(false);
                  setStatus(
                    'Original notes will also be preserved in full in the README.',
                  );
                }}
              >
                Use original notes
              </button>
            </div>
            {notes.map((note, index) => (
              <div className="mcp-note" key={index}>
                <label>
                  Important note {index + 1} title
                  <input
                    value={note.title}
                    maxLength={120}
                    onChange={(e) => {
                      setNotes(
                        notes.map((item, i) =>
                          i === index
                            ? { ...item, title: e.target.value }
                            : item,
                        ),
                      );
                      setApproved(false);
                    }}
                  />
                </label>
                <label>
                  Detail
                  <textarea
                    rows={3}
                    value={note.detail}
                    maxLength={2000}
                    onChange={(e) => {
                      setNotes(
                        notes.map((item, i) =>
                          i === index
                            ? { ...item, detail: e.target.value }
                            : item,
                        ),
                      );
                      setApproved(false);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNotes(notes.filter((_, i) => i !== index));
                    setApproved(false);
                  }}
                >
                  Remove note {index + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-action"
              disabled={notes.length >= 20}
              onClick={() => {
                setNotes([...notes, { title: 'Important note', detail: '' }]);
                setApproved(false);
              }}
            >
              Add important note
            </button>
            <label className="mcp-check">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              I reviewed the original and important notes and approve their
              inclusion as documentation.
            </label>
          </section>
          <section className="mcp-section" aria-labelledby="mcp-export-heading">
            <h2 id="mcp-export-heading">4. Download and connect</h2>
            <p>
              Your package includes the Node server, tool manifest, environment
              placeholders, README, backend configuration and working client
              example.
            </p>
            <p>
              {selected.length} tools ·{' '}
              {auth === 'none'
                ? 'No authentication'
                : auth === 'bearer'
                  ? 'Bearer token'
                  : `API key: ${header}`}{' '}
              · Destination: <code>{baseUrl}</code>
            </p>
            <button
              type="button"
              className="landing-primary"
              disabled={
                !operations ||
                !selected.length ||
                !approved ||
                !name.trim() ||
                !baseUrl ||
                !NotesSchema.safeParse(notes).success ||
                (Boolean(originalNotes.trim()) && !notes.length)
              }
              onClick={() =>
                void perform('Generating package', async () => {
                  const response = await mcpRequest('/api/mcp', {
                    ...inputSource,
                    name,
                    baseUrl,
                    operationIds: selected,
                    auth:
                      auth === 'apiKey'
                        ? { type: auth, header }
                        : { type: auth },
                    originalNotes,
                    importantNotes: notes,
                    notesApproved: true,
                  });
                  const url = URL.createObjectURL(await response.blob());
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = 'api-mcp-server.tar.gz';
                  anchor.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  setDownloaded(true);
                  setStatus(
                    'Package downloaded. Extract it and follow the connection instructions below.',
                  );
                })
              }
            >
              Download MCP server
            </button>
            <h3>Connect from your backend</h3>
            <pre>{`tar -xzf api-mcp-server.tar.gz -C /path/to/server\ncd /path/to/server\nnpm install\ncp .env.example .env\n# Edit .env if authentication is required\nnpm run client`}</pre>
            <p>
              The client launches the stdio server, lists tools and reads{' '}
              <code>notes://important</code>. To call a tool:{' '}
              <code>{`npm run client -- TOOL_NAME 'JSON_ARGUMENTS'`}</code>.
              Browser-only apps need a backend to launch it.
            </p>
            <details>
              <summary>Inputs, errors and recovery</summary>
              <p>
                Inputs use <code>path</code>, <code>query</code>, and{' '}
                <code>body</code> groups. The README documents each schema.
                Invalid inputs are rejected before API execution. JSON bodies
                follow their OpenAPI required declaration. Reimport older saved
                contracts to preserve optional-body declarations.
              </p>
              <p>
                Requests time out after 10 seconds. Redirects are rejected and
                responses are limited to 1 MiB. Check current API state before
                retrying a failed mutation; the server never retries
                automatically. Credentials are supplied separately through
                environment variables.
              </p>
            </details>
            {downloaded && (
              <p>
                See the downloaded README for each tool’s inputs and backend
                integration.
              </p>
            )}
          </section>
        </fieldset>
      </form>
      {busy && <p role="status">{busy}…</p>}
      {status && <p role="status">{status}</p>}
      {error && (
        <p className="setup-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
