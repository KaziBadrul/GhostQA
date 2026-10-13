'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import {
  ApiModelSchema,
  PredicateSchema,
  ResetConfigurationSchema,
  FrozenScopeSchema,
} from '@/engine/contracts';
import {
  DraftSchema,
  ResetInputSchema,
  InvariantInputSchema,
} from '@/server/application-contracts';
import { appRequest } from '@/lib/application-client';
import {
  setupSteps,
  firstIncompleteStep,
  setupStepStatus,
  type SetupProgress,
} from '@/lib/setup-wizard';
import {
  AppRequestError,
  describeError,
  errorGuidance,
  type ErrorGuidance,
  type FieldIssue,
} from '@/lib/error-guidance';
import { ActionableError } from './actionable-error';
import { exampleReset, exampleInvariant } from '@/lib/setup-example';
const Project = z.object({
  id: z.string(),
  name: z.string(),
  draft: DraftSchema,
  specification: ApiModelSchema.nullable(),
  reset: ResetConfigurationSchema.nullable(),
  invariant: PredicateSchema.nullable(),
  credentials: z.array(z.object({ slot: z.string(), version: z.number() })),
  runs: z.array(
    z.object({
      id: z.string(),
      state: z.string(),
      startedAt: z.string(),
      outcome: z.string(),
      stopReason: z.string().nullable(),
    }),
  ),
});
const Preview = z.object({
  previewId: z.string(),
  approvalHash: z.string(),
  expiresAt: z.string(),
  scope: FrozenScopeSchema,
});
const format = (value: unknown) => JSON.stringify(value, null, 2);
export function ProjectSetup({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<z.infer<typeof Project>>();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [requests, setRequests] = useState(200);
  const [minutes, setMinutes] = useState(10);
  const [journeys, setJourneys] = useState(20);
  const [steps, setSteps] = useState(10);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [resetText, setResetText] = useState('');
  const [invariantText, setInvariantText] = useState('');
  const [preview, setPreview] = useState<z.infer<typeof Preview>>();
  const [ack, setAck] = useState(false);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<
    (ErrorGuidance & { issues?: FieldIssue[] }) | null
  >(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [resetDirty, setResetDirty] = useState(false);
  const [invariantDirty, setInvariantDirty] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  function moveToStep(step: number) {
    setWizardStep(step);
    requestAnimationFrame(() => {
      stepHeading.current?.focus();
      stepHeading.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
    });
  }
  const [notice, setNotice] = useState('');
  const [slot, setSlot] = useState('authorization');
  const [secret, setSecret] = useState('');
  const [authKind, setAuthKind] = useState<'bearer' | 'api-key'>('bearer');
  const [header, setHeader] = useState('Authorization');
  const [importText, setImportText] = useState('');
  const [deleteAck, setDeleteAck] = useState(false);
  const [resetOp, setResetOp] = useState('');
  const [baselineOp, setBaselineOp] = useState('');
  const [resetPointer, setResetPointer] = useState('/reset');
  const [resetValue, setResetValue] = useState('true');
  const [baselinePointer, setBaselinePointer] = useState('/count');
  const [baselineValue, setBaselineValue] = useState('0');
  async function load() {
    const result = (await appRequest(`/api/projects/${id}`)) as {
      project: unknown;
    };
    const p = Project.parse(result.project);
    setProject(p);
    return p;
  }
  useEffect(() => {
    let disposed = false;
    void appRequest(`/api/projects/${id}`)
      .then((result) => {
        if (disposed) return;
        const p = Project.parse((result as { project: unknown }).project);
        setProject(p);
        setSecret('');
        setImportText('');
        setResetDirty(false);
        setInvariantDirty(false);
        setPreview(undefined);
        setAck(false);
        setApproved(false);
        setError(null);
        setNotice('');
        setResetText('');
        setInvariantText('');
        setResetPointer('/reset');
        setResetValue('true');
        setBaselinePointer('/count');
        setBaselineValue('0');
        const requestedStep = new URLSearchParams(window.location.search).get(
          'step',
        );
        setWizardStep(
          requestedStep !== null && /^[0-5]$/.test(requestedStep)
            ? Number(requestedStep)
            : firstIncompleteStep(progressFor(p)),
        );
        setName(p.name);
        setTarget(p.draft.targetUrl ?? '');
        setRequests(p.draft.limits.requests);
        setMinutes(p.draft.limits.milliseconds / 60000);
        setJourneys(p.draft.limits.journeys);
        setSteps(p.draft.limits.steps);
        setExcluded(p.draft.exclusions);
        if (p.reset)
          setResetText(
            format({
              resetSteps: p.reset.resetSteps,
              checkSteps: p.reset.checkSteps,
              resetAssertions: p.reset.resetAssertions.flatMap(
                (a) => a.predicate.assertions,
              ),
              baselineAssertions: p.reset.baselineAssertions.flatMap(
                (a) => a.predicate.assertions,
              ),
            }),
          );
        const resetAssertion =
          p.reset?.resetAssertions[0]?.predicate.assertions[0];
        const baselineAssertion =
          p.reset?.baselineAssertions[0]?.predicate.assertions[0];
        if (resetAssertion?.left.kind === 'json')
          setResetPointer(resetAssertion.left.pointer);
        if (resetAssertion?.right?.kind === 'literal')
          setResetValue(format(resetAssertion.right.value));
        if (baselineAssertion?.left.kind === 'json')
          setBaselinePointer(baselineAssertion.left.pointer);
        if (baselineAssertion?.right?.kind === 'literal')
          setBaselineValue(format(baselineAssertion.right.value));
        if (p.invariant)
          setInvariantText(
            format({
              sourceRef: p.invariant.sourceRef,
              applicability: p.invariant.applicability,
              assertions: p.invariant.assertions,
            }),
          );
        setResetOp(
          p.reset?.resetSteps[0]?.operationId ??
            p.specification?.operations.find((o) =>
              o.id.toLowerCase().includes('reset'),
            )?.id ??
            '',
        );
        setBaselineOp(
          p.reset?.checkSteps[0]?.operationId ??
            p.specification?.operations.find((o) =>
              o.id.toLowerCase().includes('baseline'),
            )?.id ??
            '',
        );
      })
      .catch((e) => {
        if (!disposed) setError(describeError(e));
      });
    return () => {
      disposed = true;
    };
  }, [id]);
  async function action(label: string, work: () => Promise<void>) {
    setBusy(label);
    setError(null);
    setNotice('');
    try {
      await work();
    } catch (e) {
      const info = describeError(e);
      setError(info);
      if (info.step !== undefined) moveToStep(info.step);
      if (e instanceof AppRequestError && e.code === 'STALE PREVIEW') {
        setPreview(undefined);
        setAck(false);
      }
    } finally {
      setBusy('');
    }
  }
  async function saveSettings() {
    await appRequest(`/api/projects/${id}`, 'PATCH', {
      name,
      targetUrl: target,
      limits: {
        requests,
        milliseconds: Math.round(minutes * 60000),
        journeys,
        steps,
        requestTimeoutMs: 10000,
        modelTimeoutMs: 30000,
      },
      exclusions: excluded,
    });
    setPreview(undefined);
    await load();
    setNotice('Project settings saved.');
  }
  function progressFor(p: z.infer<typeof Project>): SetupProgress {
    return {
      specification: !!p.specification,
      target: !!p.draft.targetUrl,
      credentials: p.credentials.length > 0,
      reset: !!p.reset,
      invariant: !!p.invariant,
      approved: !!p.draft.predicateApprovalId,
    };
  }
  function targetChanged() {
    if (!project) return false;
    return (
      name !== project.name ||
      target !== (project.draft.targetUrl ?? '') ||
      requests !== project.draft.limits.requests ||
      Math.round(minutes * 60000) !== project.draft.limits.milliseconds ||
      journeys !== project.draft.limits.journeys ||
      steps !== project.draft.limits.steps ||
      [...excluded].sort().join('\n') !==
        [...project.draft.exclusions].sort().join('\n')
    );
  }
  function readyForReview() {
    if (!project?.specification || importText.trim())
      throw new AppRequestError('UNSAVED SPECIFICATION');
    if (!project.draft.targetUrl || targetChanged())
      throw new AppRequestError('UNSAVED SETTINGS');
    if (secret) throw new AppRequestError('UNSAVED CREDENTIAL');
    if (!project.reset || resetDirty)
      throw new AppRequestError('UNSAVED CHECKS');
    if (
      !project.invariant ||
      invariantDirty ||
      !project.draft.predicateApprovalId
    )
      throw new AppRequestError('UNAPPROVED INVARIANT');
  }
  async function continueStep() {
    await action('continue', async () => {
      if (wizardStep === 0 && (!project?.specification || importText.trim()))
        throw new AppRequestError('UNSAVED SPECIFICATION');
      if (wizardStep === 1) await saveSettings();
      if (wizardStep === 2 && secret)
        throw new AppRequestError('UNSAVED CREDENTIAL');
      if (wizardStep === 3 && (!project?.reset || resetDirty))
        throw new AppRequestError('UNSAVED CHECKS');
      if (wizardStep === 4) readyForReview();
      setError(null);
      setNotice('');
      moveToStep(Math.min(5, wizardStep + 1));
    });
  }
  function simpleReset() {
    const makeStep = (role: string, operationId: string) => {
      const operation = project?.specification?.operations.find(
        (o) => o.id === operationId,
      );
      return {
        id: role,
        operationId,
        parameters: [],
        bodyBindings: [],
        extracts: [],
        expectedStatuses: [200],
        ...(operation?.requestBody ? { body: {} } : {}),
      };
    };
    return {
      resetSteps: [makeStep('reset', resetOp)],
      checkSteps: [makeStep('baseline', baselineOp)],
      resetAssertions: [
        {
          op: 'equals',
          left: { kind: 'json', stepId: 'reset', pointer: resetPointer },
          right: { kind: 'literal', value: JSON.parse(resetValue) },
        },
      ],
      baselineAssertions: [
        {
          op: 'equals',
          left: { kind: 'json', stepId: 'baseline', pointer: baselinePointer },
          right: { kind: 'literal', value: JSON.parse(baselineValue) },
        },
      ],
    };
  }
  if (!project || project.id !== id)
    return (
      <main className="setup-page">
        {error ? (
          <ActionableError error={error} />
        ) : (
          <p role="status">Loading project…</p>
        )}
      </main>
    );
  const operations = project.specification?.operations ?? [];
  return (
    <main className="setup-page">
      <div className="project-title">
        <div>
          <Link href="/projects">Projects</Link>
          <h1>{project.name}</h1>
          <p>
            Set up your API one step at a time. Saved progress is restored when
            you return.
          </p>
        </div>
        <Link href="/projects/new">Import another API</Link>
      </div>
      <div className="wizard-toolbar">
        <p>
          {setupStepStatus(5, progressFor(project)) === 'Ready to review'
            ? 'Required setup saved. Review execution before starting.'
            : 'Complete the required steps to prepare your first run.'}
        </p>
        <button
          type="button"
          className="text-action"
          disabled={!!busy}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Use guided setup' : 'Show all settings'}
        </button>
      </div>
      <nav className="wizard-nav" aria-label="Setup steps">
        <ol>
          {setupSteps.map((step, index) => (
            <li key={step.title}>
              <button
                type="button"
                disabled={!!busy}
                aria-current={wizardStep === index ? 'step' : undefined}
                onClick={() => {
                  setError(null);
                  moveToStep(index);
                }}
              >
                <span className="wizard-step-number">{index + 1}</span>
                <span>
                  {step.title}
                  <small>
                    {(index === 0 && importText.trim()) ||
                    (index === 1 && targetChanged()) ||
                    (index === 3 && resetDirty) ||
                    (index === 4 && invariantDirty)
                      ? 'Unsaved changes'
                      : setupStepStatus(index, progressFor(project))}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="wizard-heading">
        <h2 ref={stepHeading} tabIndex={-1}>
          Step {wizardStep + 1} of {setupSteps.length}:{' '}
          {setupSteps[wizardStep]!.title}
        </h2>
        <p>{setupSteps[wizardStep]!.description}</p>
      </div>
      {error && <ActionableError error={error} onFix={moveToStep} />}
      {notice && (
        <p role="status" className="setup-notice">
          {notice}
        </p>
      )}
      <section className="setup-section" hidden={!showAll && wizardStep !== 0}>
        <h2>
          {project.specification
            ? 'Your saved API specification'
            : 'Import your API specification'}
        </h2>
        {project.specification && (
          <p className="setup-notice">
            OpenAPI {project.specification.openapiVersion} saved ·{' '}
            {project.specification.operations.length} operations imported. You
            can continue with this specification or replace it below.
          </p>
        )}
        <p>
          Upload JSON or YAML, or paste the document.{' '}
          <a href="/api/example" download>
            Download the Orders example
          </a>{' '}
          to try a disposable API.
        </p>
        <p>
          Replacing the specification clears the saved checks and invariant
          approval.
        </p>
        <label>
          OpenAPI JSON or YAML
          <input
            type="file"
            accept=".json,.yaml,.yml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                if (file.size > 2 * 1024 * 1024)
                  setError(errorGuidance('IMPORT TOO LARGE'));
                else void file.text().then(setImportText);
              }
            }}
          />
        </label>
        <label>
          Specification
          <textarea
            className="mono"
            rows={8}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
        </label>
        <button
          className="setup-button"
          disabled={!!busy || !importText.trim()}
          onClick={() =>
            void action('import', async () => {
              await appRequest(
                `/api/projects/${id}/specifications`,
                'POST',
                importText,
                true,
              );
              setImportText('');
              setResetText('');
              setResetDirty(false);
              setInvariantDirty(false);
              setInvariantText('');
              setApproved(false);
              setPreview(undefined);
              await load();
              setNotice(
                'Specification saved. Configure fresh-state checks and approve a new invariant.',
              );
            })
          }
        >
          Save specification
        </button>
      </section>
      <section className="setup-section" hidden={!showAll && wizardStep !== 1}>
        <h2>Target and limits</h2>
        <div className="setup-fields">
          <label>
            Project name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setPreview(undefined);
              }}
            />
          </label>
          <label>
            Target base URL
            <input
              type="url"
              placeholder="http://127.0.0.1:4010/api"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setPreview(undefined);
              }}
            />
          </label>
          <label>
            Request limit
            <input
              type="number"
              min={5}
              max={10000}
              value={requests}
              onChange={(e) => {
                setRequests(Number(e.target.value));
                setPreview(undefined);
              }}
            />
          </label>
          <label>
            Time limit (minutes)
            <input
              type="number"
              min={1}
              max={60}
              value={minutes}
              onChange={(e) => {
                setMinutes(Number(e.target.value));
                setPreview(undefined);
              }}
            />
          </label>
          <label>
            Journey limit
            <input
              type="number"
              min={1}
              max={100}
              value={journeys}
              onChange={(e) => {
                setJourneys(Number(e.target.value));
                setPreview(undefined);
              }}
            />
          </label>
          <label>
            Steps per journey
            <input
              type="number"
              min={1}
              max={10}
              value={steps}
              onChange={(e) => {
                setSteps(Number(e.target.value));
                setPreview(undefined);
              }}
            />
          </label>
        </div>
        <p>
          The URL is explicit execution scope. Paths in the specification remain
          absolute; the base path restricts them. Use a disposable development
          target.
        </p>
        <button
          disabled={!!busy}
          className="landing-primary"
          onClick={() => void action('settings', saveSettings)}
        >
          Save settings
        </button>
      </section>
      <section className="setup-section" hidden={!showAll && wizardStep !== 1}>
        <h2>Allowed operations</h2>
        <p>
          {operations.length} imported operations. Exclude anything you do not
          want GhostQA to execute. Reset and baseline operations are classified
          from your checks below.
        </p>
        <div className="operation-choices">
          {operations.map((op) => (
            <label key={op.id}>
              <input
                type="checkbox"
                disabled={!op.eligible}
                checked={excluded.includes(op.id) || !op.eligible}
                onChange={(e) => {
                  setExcluded(
                    e.target.checked
                      ? [...excluded, op.id]
                      : excluded.filter((v) => v !== op.id),
                  );
                  setPreview(undefined);
                }}
              />
              <code>
                {op.method} {op.pathTemplate}
              </code>
              <span>
                {!op.eligible
                  ? `Unsupported: ${op.exclusionReasons.join(', ')}`
                  : excluded.includes(op.id)
                    ? 'Excluded'
                    : project.reset?.resetSteps.some(
                          (s) => s.operationId === op.id,
                        )
                      ? 'Reset only'
                      : project.reset?.checkSteps.some(
                            (s) => s.operationId === op.id,
                          )
                        ? 'Baseline only'
                        : 'Exploration'}
              </span>
            </label>
          ))}
        </div>
        <button
          disabled={!!busy}
          className="landing-secondary"
          onClick={() => void action('settings', saveSettings)}
        >
          Save exclusions
        </button>
      </section>
      <section className="setup-section" hidden={!showAll && wizardStep !== 2}>
        <h2>
          Authentication <small>Optional</small>
        </h2>
        <p>
          Leave this empty if your API has no authentication. The Orders example
          does not require credentials.
        </p>
        <p>
          Saved with authenticated encryption. Values are never returned; the
          engine resolves the selected versions only inside execution.
        </p>
        {project.credentials.map((c) => (
          <p key={c.slot}>
            <code>{c.slot}</code> · version {c.version} saved
          </p>
        ))}
        <div className="setup-fields">
          <label>
            Credential slot
            <input value={slot} onChange={(e) => setSlot(e.target.value)} />
          </label>
          <label>
            Authentication type
            <select
              value={authKind}
              onChange={(e) => {
                const kind = e.target.value as 'bearer' | 'api-key';
                setAuthKind(kind);
                setHeader(kind === 'bearer' ? 'Authorization' : 'X-API-Key');
              }}
            >
              <option value="bearer">Bearer token</option>
              <option value="api-key">API key header</option>
            </select>
          </label>
          <label>
            Header name
            <input value={header} onChange={(e) => setHeader(e.target.value)} />
          </label>
          <label>
            Secret value
            <input
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </label>
        </div>
        <button
          disabled={!!busy || !secret}
          className="landing-secondary"
          onClick={() =>
            void action('credential', async () => {
              z.strictObject({
                slot: z.string().regex(/^[A-Za-z0-9_-]+$/),
              }).parse({ slot });
              await appRequest(
                `/api/projects/${id}/credentials/${encodeURIComponent(slot)}`,
                'PUT',
                { value: secret, kind: authKind, name: header },
              );
              setSecret('');
              setPreview(undefined);
              await load();
              setNotice('Encrypted credential saved.');
            })
          }
        >
          Save encrypted credential
        </button>
      </section>
      <section
        className="setup-section"
        hidden={!showAll && wizardStep !== 3}
        onChangeCapture={() => {
          setResetDirty(true);
          setPreview(undefined);
          setAck(false);
        }}
      >
        <h2>Reset and verify fresh state</h2>
        <p>
          A reset restores the initial test data. A baseline inspection proves
          that reset worked. Every trial repeats both checks; failed checks
          prevent exploration.
        </p>
        <p>
          For the bundled Orders API, choose Load Orders example below: it
          checks <code>/reset = true</code> and <code>/orders = 0</code>. A JSON
          Pointer such as <code>/orders</code> selects that field from a
          response body.
        </p>
        <div className="setup-fields">
          <label>
            Reset operation
            <select
              value={resetOp}
              onChange={(e) => setResetOp(e.target.value)}
            >
              <option value="">Choose an operation</option>
              {operations
                .filter((o) => o.eligible)
                .map((o) => (
                  <option key={o.id}>{o.id}</option>
                ))}
            </select>
          </label>
          <label>
            Baseline inspection
            <select
              value={baselineOp}
              onChange={(e) => setBaselineOp(e.target.value)}
            >
              <option value="">Choose an operation</option>
              {operations
                .filter((o) => o.eligible)
                .map((o) => (
                  <option key={o.id}>{o.id}</option>
                ))}
            </select>
          </label>
          <label>
            Reset response field (JSON Pointer)
            <input
              value={resetPointer}
              onChange={(e) => setResetPointer(e.target.value)}
            />
          </label>
          <label>
            Expected reset value (JSON)
            <input
              value={resetValue}
              onChange={(e) => setResetValue(e.target.value)}
            />
          </label>
          <label>
            Baseline response field (JSON Pointer)
            <input
              value={baselinePointer}
              onChange={(e) => setBaselinePointer(e.target.value)}
            />
          </label>
          <label>
            Expected baseline value (JSON)
            <input
              value={baselineValue}
              onChange={(e) => setBaselineValue(e.target.value)}
            />
          </label>
        </div>
        <div className="landing-actions">
          <button
            disabled={!!busy || !resetOp || !baselineOp}
            className="landing-secondary"
            onClick={() =>
              void action('reset', async () => {
                const value = ResetInputSchema.parse(simpleReset());
                await appRequest(`/api/projects/${id}/reset`, 'PUT', value);
                setResetText(format(value));
                setPreview(undefined);
                await load();
                setResetDirty(false);
                setNotice('Fresh-state checks saved.');
              })
            }
          >
            Save simple checks
          </button>
          <button
            className="text-action"
            onClick={() => {
              setResetDirty(true);
              setPreview(undefined);
              setAck(false);
              setResetText(format(exampleReset));
              setResetPointer('/reset');
              setResetValue('true');
              setBaselineValue('0');
              setBaselinePointer('/orders');
              setResetOp('POST /api/control/reset');
              setBaselineOp('GET /api/control/baseline');
            }}
          >
            Load Orders example
          </button>
        </div>
        <details>
          <summary>
            Advanced reset definition (bodies, parameters, multiple checks)
          </summary>
          <label>
            Reset configuration JSON
            <textarea
              value={resetText}
              spellCheck={false}
              onChange={(e) => setResetText(e.target.value)}
            />
          </label>
          <button
            disabled={!!busy}
            className="landing-secondary"
            onClick={() =>
              void action('reset', async () => {
                await appRequest(
                  `/api/projects/${id}/reset`,
                  'PUT',
                  ResetInputSchema.parse(JSON.parse(resetText)),
                );
                setPreview(undefined);
                await load();
                setResetDirty(false);
                setNotice('Fresh-state definition saved.');
              })
            }
          >
            Save advanced checks
          </button>
        </details>
        <p>
          {project.reset
            ? 'Saved reset and baseline configuration'
            : 'Checks not saved yet'}
        </p>
      </section>
      <section className="setup-section" hidden={!showAll && wizardStep !== 4}>
        <h2>Define expected behavior</h2>
        <p>
          An invariant is a rule that must remain true. For example: a cancelled
          order must never later become fulfilled.
        </p>
        <p>
          Describe expected behavior with machine-checkable comparisons. Step
          names are evidence roles the planner must supply; they are not an
          executable journey. Editing creates a new identity and requires
          approval again.
        </p>
        <div className="landing-actions">
          <button
            className="text-action"
            onClick={() => {
              setInvariantDirty(true);
              setPreview(undefined);
              setAck(false);
              setInvariantText(format(exampleInvariant));
              setApproved(false);
            }}
          >
            Load Orders invariant example
          </button>
          <button
            className="text-action"
            onClick={() => {
              setInvariantDirty(true);
              setPreview(undefined);
              setAck(false);
              setInvariantText(
                format({
                  sourceRef:
                    'The inspected operation returns the expected state.',
                  applicability: [
                    {
                      op: 'equals',
                      left: { kind: 'operation', stepId: 'inspect' },
                      right: {
                        kind: 'literal',
                        value:
                          operations.find(
                            (o) =>
                              o.method === 'GET' &&
                              !o.pathTemplate.includes('control'),
                          )?.id ?? 'GET /example',
                      },
                    },
                  ],
                  assertions: [
                    {
                      op: 'equals',
                      left: {
                        kind: 'json',
                        stepId: 'inspect',
                        pointer: '/state',
                      },
                      right: { kind: 'literal', value: 'EXPECTED_STATE' },
                    },
                  ],
                }),
              );
              setApproved(false);
            }}
          >
            Start a response-field assertion
          </button>
        </div>
        <label>
          Invariant definition JSON
          <textarea
            spellCheck={false}
            value={invariantText}
            onChange={(e) => {
              setInvariantText(e.target.value);
              setInvariantDirty(true);
              setPreview(undefined);
              setAck(false);
              setApproved(false);
            }}
          />
        </label>
        <button
          disabled={!!busy}
          className="landing-secondary"
          onClick={() =>
            void action('predicate', async () => {
              await appRequest(
                `/api/projects/${id}/predicates`,
                'POST',
                InvariantInputSchema.parse(JSON.parse(invariantText)),
              );
              setPreview(undefined);
              setApproved(false);
              await load();
              setInvariantDirty(false);
              setNotice('New invariant saved; review and approve it below.');
            })
          }
        >
          Save invariant
        </button>
        {project.invariant && (
          <div className="predicate-approval">
            <p>
              <strong>Saved invariant:</strong> {project.invariant.sourceRef}
            </p>
            <code>
              Version {project.invariant.version} ·{' '}
              {project.invariant.canonicalHash.slice(0, 16)}
            </code>
            <label className="check-label">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              I reviewed the saved invariant and approve this expected behavior.
            </label>
            <button
              disabled={!!busy || !approved || invariantDirty}
              className="landing-secondary"
              onClick={() =>
                void action('approve', async () => {
                  await appRequest(
                    `/api/projects/${id}/predicates/${project.invariant!.id}/approvals`,
                    'POST',
                    project.draft.predicateRef,
                  );
                  setPreview(undefined);
                  await load();
                  setNotice('Invariant approved.');
                })
              }
            >
              Approve saved invariant
            </button>
            <p>
              {project.draft.predicateApprovalId
                ? 'Approved'
                : 'Approval required'}
            </p>
          </div>
        )}
      </section>
      <section className="setup-section" hidden={!showAll && wizardStep !== 5}>
        <h2>Review your saved setup</h2>
        <dl className="wizard-review">
          <div>
            <dt>API</dt>
            <dd>
              {project.specification
                ? `${project.specification.operations.length} operations imported`
                : 'Specification missing'}{' '}
              <button
                type="button"
                className="text-action"
                onClick={() => moveToStep(0)}
              >
                Edit API
              </button>
            </dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>
              {project.draft.targetUrl || 'Target missing'}{' '}
              <button
                type="button"
                className="text-action"
                onClick={() => moveToStep(1)}
              >
                Edit target
              </button>
            </dd>
          </div>
          <div>
            <dt>Limits</dt>
            <dd>
              {project.draft.limits.requests} requests ·{' '}
              {project.draft.limits.milliseconds / 60000} min ·{' '}
              {project.draft.limits.journeys} journeys ·{' '}
              {project.draft.limits.steps} steps
            </dd>
          </div>
          <div>
            <dt>Authentication</dt>
            <dd>
              {project.credentials.length
                ? `${project.credentials.length} encrypted credential slots`
                : 'No credentials configured'}{' '}
              <button
                type="button"
                className="text-action"
                onClick={() => moveToStep(2)}
              >
                Edit authentication
              </button>
            </dd>
          </div>
          <div>
            <dt>Fresh state</dt>
            <dd>
              {project.reset
                ? `${project.reset.resetSteps.length} reset request(s), ${project.reset.checkSteps.length} baseline check(s)`
                : 'Checks missing'}{' '}
              <button
                type="button"
                className="text-action"
                onClick={() => moveToStep(3)}
              >
                Edit checks
              </button>
            </dd>
          </div>
          <div>
            <dt>Expected behavior</dt>
            <dd>
              {project.invariant?.sourceRef || 'Invariant missing'} ·{' '}
              {project.draft.predicateApprovalId
                ? 'Approved'
                : 'Approval required'}{' '}
              <button
                type="button"
                className="text-action"
                onClick={() => moveToStep(4)}
              >
                Edit invariant
              </button>
            </dd>
          </div>
        </dl>
        <h3>Approve the execution scope</h3>
        <p>
          Preview resolves and freezes the destination addresses and operation
          policy. Approval expires after 60 seconds and is invalidated by
          changes to saved setup.
        </p>
        <button
          disabled={!!busy}
          className="landing-primary"
          onClick={() =>
            void action('preview', async () => {
              readyForReview();
              setPreview(
                Preview.parse(
                  await appRequest(
                    `/api/projects/${id}/scope-preview`,
                    'POST',
                    {},
                  ),
                ),
              );
              setAck(false);
              setNotice('Review the frozen scope before starting.');
            })
          }
        >
          Preview execution scope
        </button>
        {preview && (
          <div className="scope-preview">
            <h3>
              {preview.scope.origin}/{preview.scope.basePathSegments.join('/')}
            </h3>
            <p>
              Pinned addresses:{' '}
              {preview.scope.addresses.map((a) => a.ip).join(', ')} · expires{' '}
              {new Date(preview.expiresAt).toLocaleTimeString()}
            </p>
            <ul>
              {preview.scope.operationPolicy.map((op) => (
                <li key={op.operationId}>
                  <code>{op.operationId}</code>
                  <span>
                    {op.category} · {op.phases.join(', ') || 'never'}
                  </span>
                </li>
              ))}
            </ul>
            <label className="check-label">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              I approve these addresses and operations. Requests may mutate or
              reset target data.
            </label>
            <button
              className="landing-primary"
              disabled={!!busy || !ack}
              onClick={() =>
                void action('start', async () => {
                  readyForReview();
                  if (Date.parse(preview.expiresAt) <= Date.now())
                    throw new AppRequestError('STALE PREVIEW');
                  const result = (await appRequest(
                    `/api/projects/${id}/runs`,
                    'POST',
                    {
                      previewId: preview.previewId,
                      approvalHash: preview.approvalHash,
                      mutationsAcknowledged: true,
                    },
                  )) as { run: { id: string } };
                  router.push(`/runs/${result.run.id}`);
                })
              }
            >
              {busy === 'start'
                ? 'Admitting run…'
                : 'Approve scope and start run'}
            </button>
          </div>
        )}
      </section>
      {!showAll && (
        <div className="wizard-footer">
          <button
            type="button"
            className="landing-secondary"
            disabled={!!busy || wizardStep === 0}
            onClick={() => {
              setError(null);
              moveToStep(wizardStep - 1);
            }}
          >
            Back
          </button>
          <p>
            {wizardStep === 2
              ? 'Authentication is optional. Secret values are never stored in browser progress.'
              : 'Changes are saved only when you choose a save action.'}
          </p>
          {wizardStep < 5 && (
            <button
              type="button"
              className="landing-primary"
              disabled={!!busy}
              onClick={() => void continueStep()}
            >
              {busy === 'continue'
                ? 'Saving…'
                : wizardStep === 1
                  ? 'Save target and continue'
                  : wizardStep === 2 && !project.credentials.length && !secret
                    ? 'Continue without credentials'
                    : 'Continue'}
            </button>
          )}
        </div>
      )}
      <section className="setup-section">
        <h2>Run history</h2>
        {project.runs.length === 0 ? (
          <p>No runs yet.</p>
        ) : (
          project.runs.map((r) => (
            <Link className="history-row" href={`/runs/${r.id}`} key={r.id}>
              <span>{new Date(r.startedAt).toLocaleString()}</span>
              <strong>
                {r.state} · {r.outcome}
              </strong>
              <span>{r.stopReason ?? 'Active'}</span>
            </Link>
          ))
        )}
      </section>
      <details className="setup-section">
        <summary>Delete project and its saved data</summary>
        <label className="check-label">
          <input
            type="checkbox"
            checked={deleteAck}
            onChange={(e) => setDeleteAck(e.target.checked)}
          />
          Delete this project, credentials, runs, and evidence permanently.
        </label>
        <button
          className="landing-secondary"
          disabled={!deleteAck || !!busy}
          onClick={() =>
            void action('delete', async () => {
              await appRequest(`/api/projects/${id}`, 'DELETE', {
                confirmed: true,
              });
              router.push('/projects');
            })
          }
        >
          Delete project
        </button>
      </details>
    </main>
  );
}
