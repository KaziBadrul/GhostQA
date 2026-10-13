import { runFailure, modelFailureCode } from './run-errors';
import { randomUUID, createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import {
  ApiModelSchema,
  PredicateSchema,
  ResetConfigurationSchema,
  RunSchema,
  Id,
  type Json,
  type Predicate,
  type Run,
  type FrozenScope,
} from '../engine/contracts';
import { BudgetManager } from '../engine/budget/manager';
import { approveScope } from '../engine/policy/scope';
import { serializedHeaders } from '../engine/execution/auth';
import { canonical, predicateHash } from '../engine/detection/predicate';
import { validateJourney } from '../engine/validation/journey';
import { SecretVault } from '../engine/secrets/vault';
import { sanitizeDocument } from '../engine/openapi/sanitize';
import { parseOpenApi } from '../engine/openapi/parse';
import {
  savePredicate,
  approvePredicate,
  loadPredicate,
} from './repositories/predicates';
import { CredentialStore } from './credential-store';
import { createDatabase } from './db';
import { readConfig } from './config';
import { runVerticalSlice } from '../cli/vertical-slice';
import { createGeminiProvider } from '../engine/planning/gemini';
import type { ReasoningProvider } from '../engine/planning/provider';
import { RunSupervisor } from './run-supervisor';
import type { ApplicationEngine } from './application-runtime';
import {
  CreateProjectSchema,
  DraftSchema,
  EditProjectSchema,
  ResetInputSchema,
  InvariantInputSchema,
  CredentialInputSchema,
  PreviewInputSchema,
  StartInputSchema,
  type Draft,
} from './application-contracts';
import { DemoRunRecordSchema, type DemoRunRecord } from './demo/contracts';
import { RunRepository } from './repositories/runs';

interface ProjectRow {
  id: string;
  name: string;
  target_template: unknown;
}
interface Preview {
  scope: FrozenScope;
  fingerprint: string;
  expiresAt: string;
  approvalHash: string;
}
interface Live {
  id: string;
  projectId: string;
  supervisor?: RunSupervisor;
  done: Promise<void>;
}
const hash = (value: unknown) =>
  createHash('sha256').update(canonical(value)).digest('hex');
function predicate(
  sourceRef: string,
  applicability: Predicate['applicability'],
  assertions: Predicate['assertions'],
) {
  return PredicateSchema.parse({
    id: randomUUID(),
    version: 1,
    source: 'DEVELOPER',
    sourceRef,
    applicability,
    assertions,
    canonicalHash: predicateHash({ applicability, assertions }),
  });
}
const terminalFailure = new Set([
  'MODEL ERROR',
  'MODEL PLAN ERROR',
  'BASELINE ERROR',
  'EXECUTION ERROR',
  'STORAGE ERROR',
  'OWNERSHIP LOST',
  'WORKER ERROR',
  'SHUTDOWN',
  'CANCELLED',
]);

export class ApplicationController implements ApplicationEngine {
  private live?: Live;
  constructor(
    readonly pool: Pool,
    readonly config: ReturnType<typeof readConfig>,
    readonly providerFactory: () => ReasoningProvider = () =>
      createGeminiProvider({
        model: config.geminiModel,
        apiKey: config.geminiApiKey,
        requestsPerMinute: config.geminiRequestsPerMinute,
      }),
    readonly modelReady: () => Promise<void> = async () => {
      try {
        await new GoogleGenAI({
          apiKey: config.geminiApiKey,
          httpOptions: { timeout: 10000, retryOptions: { attempts: 1 } },
        }).models.get({ model: config.geminiModel });
      } catch (error) {
        const status =
          error &&
          typeof error === 'object' &&
          'status' in error &&
          typeof error.status === 'number'
            ? error.status
            : undefined;
        throw new Error(
          modelFailureCode({ diagnostic: { httpStatus: status } }) ??
            'MODEL UNAVAILABLE',
        );
      }
    },
  ) {}
  private async client<T>(action: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      return await action(client);
    } finally {
      client.release();
    }
  }
  private async project(client: PoolClient, id: string, lock = false) {
    Id.parse(id);
    const result = await client.query<ProjectRow>(
      `SELECT id,name,target_template FROM projects WHERE id=$1${lock ? ' FOR UPDATE' : ''}`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new Error('NOT FOUND');
    return {
      id: row.id,
      name: row.name,
      draft: DraftSchema.parse(row.target_template),
    };
  }
  private async update(client: PoolClient, id: string, draft: Draft) {
    await client.query(
      'UPDATE projects SET target_template=$2,updated_at=now() WHERE id=$1',
      [id, DraftSchema.parse(draft)],
    );
  }
  private async transaction<T>(client: PoolClient, action: () => Promise<T>) {
    await client.query('BEGIN');
    try {
      const result = await action();
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  private async vault<T>(
    client: PoolClient,
    projectId: string,
    action: (vault: SecretVault) => Promise<T>,
  ) {
    const vault = new SecretVault();
    try {
      const credentials = await client.query<{
        slot_name: string;
        version: number;
      }>('SELECT slot_name,version FROM credentials WHERE project_id=$1', [
        projectId,
      ]);
      const store = new CredentialStore(client, this.config.credentialKey);
      for (const c of credentials.rows)
        vault.register(
          await store.resolve({
            projectId,
            slot: c.slot_name,
            version: c.version,
          }),
        );
      return await action(vault);
    } finally {
      vault.discard();
    }
  }
  private async safe(client: PoolClient, id: string, value: unknown) {
    await this.vault(client, id, async (vault) => {
      if (
        canonical(sanitizeDocument(value as Json, vault)) !== canonical(value)
      )
        throw new Error('SECRET IN CONFIGURATION');
    });
  }
  private async specification(client: PoolClient, id: string, draft: Draft) {
    if (!draft.specificationId) throw new Error('SETUP REQUIRED');
    const result = await client.query<{ api_model: unknown }>(
      'SELECT api_model FROM specifications WHERE project_id=$1 AND id=$2',
      [id, draft.specificationId],
    );
    if (!result.rows[0]) throw new Error('SETUP REQUIRED');
    return ApiModelSchema.parse(result.rows[0].api_model);
  }
  private async detail(client: PoolClient, id: string) {
    const p = await this.project(client, id);
    const specification = p.draft.specificationId
      ? await this.specification(client, id, p.draft)
      : null;
    const reset = await client.query<{ definition: unknown }>(
      'SELECT definition FROM resets WHERE project_id=$1 AND id=$2 AND version=$3',
      [id, p.draft.resetId ?? null, p.draft.resetVersion ?? null],
    );
    const invariant = p.draft.predicateRef
      ? await loadPredicate(client, id, p.draft.predicateRef)
      : null;
    const credentials = await client.query<{ slot: string; version: number }>(
      'SELECT slot_name AS slot,max(version)::int AS version FROM credentials WHERE project_id=$1 GROUP BY slot_name',
      [id],
    );
    const runs = await client.query<{ presentation: unknown }>(
      'SELECT presentation FROM application_runs WHERE project_id=$1 ORDER BY created_at DESC LIMIT 50',
      [id],
    );
    return {
      ...p,
      specification,
      reset: reset.rows[0]?.definition ?? null,
      invariant,
      credentials: credentials.rows,
      runs: runs.rows.map((r) => r.presentation),
    };
  }
  private async setup(client: PoolClient, id: string) {
    const p = await this.project(client, id),
      api = await this.specification(client, id, p.draft);
    if (
      !p.draft.targetUrl ||
      !p.draft.resetId ||
      !p.draft.predicateRef ||
      !p.draft.predicateApprovalId
    )
      throw new Error('SETUP REQUIRED');
    const r = await client.query<{ definition: unknown }>(
      'SELECT definition FROM resets WHERE project_id=$1 AND id=$2 AND version=$3',
      [id, p.draft.resetId, p.draft.resetVersion],
    );
    if (!r.rows[0]) throw new Error('SETUP REQUIRED');
    const reset = ResetConfigurationSchema.parse(r.rows[0].definition),
      invariant = await loadPredicate(client, id, p.draft.predicateRef);
    const approval = await client.query(
      "SELECT id FROM approvals WHERE id=$1 AND project_id=$2 AND kind='PREDICATE' AND subject_hash=$3 AND details->>'predicateId'=$4 AND details->>'version'=$5",
      [
        p.draft.predicateApprovalId,
        id,
        invariant.canonicalHash,
        invariant.id,
        String(invariant.version),
      ],
    );
    if (approval.rowCount !== 1) throw new Error('SETUP REQUIRED');
    const resetOps = new Set(reset.resetSteps.map((s) => s.operationId)),
      checkOps = new Set(reset.checkSteps.map((s) => s.operationId));
    if ([...resetOps].some((op) => checkOps.has(op)))
      throw new Error('INVALID SETUP: PHASE CONFLICT');
    if (
      [...resetOps, ...checkOps].some((op) => p.draft.exclusions.includes(op))
    )
      throw new Error('INVALID SETUP: CONTROL EXCLUDED');
    const policy = api.operations.map((op) => ({
      operationId: op.id,
      category:
        !op.eligible || p.draft.exclusions.includes(op.id)
          ? ('EXCLUDED' as const)
          : resetOps.has(op.id)
            ? ('RESET' as const)
            : checkOps.has(op.id)
              ? ('BASELINE' as const)
              : ('EXPLORATION' as const),
      phases:
        !op.eligible || p.draft.exclusions.includes(op.id)
          ? []
          : resetOps.has(op.id)
            ? ['RESET' as const]
            : checkOps.has(op.id)
              ? ['BASELINE' as const]
              : [
                  'EXPLORATION' as const,
                  'REPLAY' as const,
                  'MINIMIZATION' as const,
                  'ARTIFACT' as const,
                ],
    }));
    if (!policy.some((op) => op.category === 'EXPLORATION'))
      throw new Error('INVALID SETUP: NO EXPLORATION');
    // Structural validation uses a placeholder address only; no request is dispatched.
    const target = new URL(p.draft.targetUrl),
      literal = target.hostname.replace(/^\[|\]$/g, '');
    const scope = approveScope(
      p.draft.targetUrl,
      [
        {
          ip: isIP(literal) ? literal : '127.0.0.1',
          family: isIP(literal) === 6 ? 6 : 4,
        },
      ],
      policy,
      true,
      randomUUID(),
    );
    try {
      for (const [steps, phase] of [
        [reset.resetSteps, 'RESET'],
        [reset.checkSteps, 'BASELINE'],
      ] as const)
        validateJourney(
          {
            id: randomUUID(),
            steps,
            variables: [],
            dependencies: [],
            predicateRef: p.draft.predicateRef,
            rationale: 'Developer configured fresh-state checks',
          },
          api,
          scope,
          phase,
        );
      const setupSteps = [...reset.resetSteps, ...reset.checkSteps];
      if (new Set(setupSteps.map((s) => s.id)).size !== setupSteps.length)
        throw Error('DUPLICATE STEP');
      const names = new Set(setupSteps.map((s) => s.id));
      for (const a of [...reset.resetAssertions, ...reset.baselineAssertions])
        for (const c of [
          ...a.predicate.applicability,
          ...a.predicate.assertions,
        ])
          for (const operand of [c.left, c.right])
            if (operand && 'stepId' in operand && !names.has(operand.stepId))
              throw Error('ASSERTION STEP');
      for (const c of [...invariant.applicability, ...invariant.assertions])
        for (const operand of [c.left, c.right])
          if (operand?.kind === 'operation' && operand.stepId === '')
            throw Error();
    } catch (error) {
      const rule = error instanceof Error ? error.message : '';
      if (
        [
          'UNKNOWN OPERATION',
          'MISSING PARAMETER',
          'MISSING BODY',
          'INVALID BODY',
          'INVALID BODY POINTER',
          'DUPLICATE STEP',
          'ASSERTION STEP',
          'INVALID DEPENDENCY',
        ].includes(rule)
      )
        throw new Error(`INVALID SETUP: ${rule}`);
      throw new Error('INVALID SETUP');
    }
    await this.safe(client, id, { draft: p.draft, reset, invariant });
    return {
      p,
      api,
      reset,
      invariant,
      policy,
      fingerprint: hash({ draft: p.draft, api, reset, invariant }),
    };
  }
  async command(
    action: string,
    id?: string,
    value?: unknown,
    extra?: string,
  ): Promise<unknown> {
    if (action === 'start')
      return this.start(id!, StartInputSchema.parse(value));
    if (action === 'cancel') {
      if (this.live && this.live.id === id) {
        if (!this.live.supervisor) throw Error('RUN ADMISSION IN PROGRESS');
        this.live.supervisor.cancel();
        return { state: 'STOPPING', dispatchDisabled: true };
      }
      return this.client(async (c) => {
        const run = await c.query('SELECT status FROM runs WHERE id=$1', [id]);
        if (!run.rows[0]) throw Error('NOT FOUND');
        return { state: run.rows[0].status, dispatchDisabled: true };
      });
    }
    if (action === 'run') return this.runDetail(id!);
    if (action === 'report')
      return this.client(async (c) => {
        const r = await c.query(
          'SELECT report_markdown AS markdown,report_json AS json FROM application_runs WHERE id=$1',
          [id],
        );
        if (!r.rows[0]?.json) throw Error('NOT FOUND');
        return r.rows[0];
      });
    if (action === 'export')
      return this.client(async (c) => {
        const r = await c.query(
          'SELECT report_markdown AS markdown,report_json AS json,bundle FROM application_runs WHERE id=$1',
          [id],
        );
        if (!r.rows[0]) throw Error('NOT FOUND');
        return r.rows[0];
      });
    if (action === 'trace')
      return this.client(async (c) => {
        const r = await c.query<{ project_id: string }>(
          'SELECT project_id FROM runs WHERE id=$1',
          [id],
        );
        if (!r.rows[0]) throw Error('NOT FOUND');
        return new RunRepository(c).trace(r.rows[0].project_id, id!);
      });
    return this.client(async (client) => {
      if (action === 'list') {
        const r = await client.query(
          "SELECT id,name,target_template,created_at,updated_at FROM projects WHERE target_template ? 'limits' ORDER BY updated_at DESC LIMIT 100",
        );
        return {
          projects: r.rows.map((row) => ({
            id: row.id,
            name: row.name,
            draft: DraftSchema.safeParse(row.target_template).success
              ? DraftSchema.parse(row.target_template)
              : null,
            updatedAt: row.updated_at,
          })),
        };
      }
      if (action === 'create') {
        const data = CreateProjectSchema.parse(value),
          projectId = randomUUID();
        const draft = DraftSchema.parse({
          targetUrl: data.targetTemplate.targetUrl,
          limits: data.targetTemplate.limits,
          exclusions: [],
        });
        await client.query(
          'INSERT INTO projects(id,name,target_template) VALUES($1,$2,$3)',
          [projectId, data.name, draft],
        );
        return { project: await this.detail(client, projectId) };
      }
      if (action === 'get') return { project: await this.detail(client, id!) };
      if (action === 'credential') {
        await this.project(client, id!);
        const input = CredentialInputSchema.parse(value),
          slot = z
            .string()
            .regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/)
            .parse(extra);
        serializedHeaders({ [input.name]: 'validation' });
        const binding = await new CredentialStore(
          client,
          this.config.credentialKey,
        ).replace(id!, slot, input.value);
        await this.transaction(client, async () => {
          const p = await this.project(client, id!, true);
          p.draft.credentialBindings = p.draft.credentialBindings.filter(
            (b) => b.slot !== slot,
          );
          p.draft.credentialBindings.push({
            ...binding,
            kind: input.kind,
            location: 'header',
            name: input.name,
          });
          await this.update(client, id!, p.draft);
        });
        return { credential: binding };
      }
      if (action === 'preview') {
        PreviewInputSchema.parse(value);
        const setup = await this.setup(client, id!);
        const hostname = new URL(setup.p.draft.targetUrl!).hostname.replace(
          /^\[|\]$/g,
          '',
        );
        let addresses: { ip: string; family: 4 | 6 }[];
        try {
          const result = await Promise.race([
            lookup(hostname, { all: true }),
            new Promise<never>((_, reject) => {
              const t = setTimeout(() => reject(Error('INVALID SETUP')), 10000);
              t.unref();
            }),
          ]);
          addresses = result.map((a) => ({
            ip: a.address,
            family: a.family as 4 | 6,
          }));
        } catch {
          throw Error('TARGET RESOLUTION FAILED');
        }
        const previewId = randomUUID(),
          scope = approveScope(
            setup.p.draft.targetUrl!,
            addresses,
            setup.policy,
            true,
            randomUUID(),
          ),
          expiresAt = new Date(Date.now() + 60000).toISOString();
        const preview: Preview = {
          scope,
          fingerprint: setup.fingerprint,
          expiresAt,
          approvalHash: hash({
            scope,
            fingerprint: setup.fingerprint,
            expiresAt,
          }),
        };
        await client.query(
          "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE_PREVIEW',$3,$4)",
          [previewId, id, preview.approvalHash, preview],
        );
        return { previewId, ...preview };
      }
      return this.transaction(client, async () => {
        const p = await this.project(client, id!, true);
        if (action === 'edit') {
          const data = EditProjectSchema.parse(value);
          if (data.name)
            await client.query('UPDATE projects SET name=$2 WHERE id=$1', [
              id,
              data.name,
            ]);
          const { name, ...settings } = data;
          void name;
          const draft = DraftSchema.parse({ ...p.draft, ...settings });
          await this.safe(client, id!, draft);
          await this.update(client, id!, draft);
          return { project: await this.detail(client, id!) };
        }
        if (action === 'delete') {
          if (
            !z.strictObject({ confirmed: z.literal(true) }).safeParse(value)
              .success
          )
            throw Error('CONFIRMATION REQUIRED');
          const active = await client.query(
            "SELECT id FROM runs WHERE project_id=$1 AND status IN ('ACCEPTED','RUNNING','STOPPING')",
            [id],
          );
          if (active.rowCount || this.live?.projectId === id)
            throw Error('ANOTHER RUN IN PROGRESS');
          await client.query('DELETE FROM projects WHERE id=$1', [id]);
          return { deleted: true };
        }
        if (action === 'import') {
          const source = z.string().parse(value),
            api = await parseOpenApi(source);
          await this.vault(client, id!, async (vault) => {
            const safe = sanitizeDocument(api as unknown as Json, vault, true);
            if (canonical(safe) !== canonical(api))
              throw Error('SECRET IN CONFIGURATION');
            await client.query(
              'INSERT INTO specifications(id,project_id,sanitized_document,sanitized_hash,openapi_version,api_model,diagnostics) VALUES($1,$2,$3,$4,$5,$6,$7)',
              [
                api.snapshotId,
                id,
                safe,
                hash(safe),
                api.openapiVersion,
                safe,
                JSON.stringify(api.importDiagnostics),
              ],
            );
          });
          p.draft.specificationId = api.snapshotId;
          delete p.draft.resetId;
          delete p.draft.resetVersion;
          delete p.draft.predicateRef;
          delete p.draft.predicateApprovalId;
          await this.update(client, id!, p.draft);
          return { project: await this.detail(client, id!) };
        }
        if (action === 'reset') {
          const input = ResetInputSchema.parse(value);
          await this.safe(client, id!, input);
          const reset = ResetConfigurationSchema.parse({
            id: randomUUID(),
            version: 1,
            resetSteps: input.resetSteps,
            checkSteps: input.checkSteps,
            resetAssertions: [
              {
                id: randomUUID(),
                predicate: predicate(
                  'Developer reset acknowledgement',
                  [],
                  input.resetAssertions,
                ),
              },
            ],
            baselineAssertions: [
              {
                id: randomUUID(),
                predicate: predicate(
                  'Developer fresh-state baseline',
                  [],
                  input.baselineAssertions,
                ),
              },
            ],
          });
          await client.query(
            'INSERT INTO resets(id,project_id,version,definition) VALUES($1,$2,$3,$4)',
            [reset.id, id, reset.version, reset],
          );
          p.draft.resetId = reset.id;
          p.draft.resetVersion = reset.version;
          await this.update(client, id!, p.draft);
          return { reset };
        }
        if (action === 'predicate') {
          const input = InvariantInputSchema.parse(value);
          await this.safe(client, id!, input);
          const definition = predicate(
            input.sourceRef,
            input.applicability,
            input.assertions,
          );
          await this.vault(client, id!, (v) =>
            savePredicate(client, id!, definition, v),
          );
          p.draft.predicateRef = {
            id: definition.id,
            version: definition.version,
            hash: definition.canonicalHash,
          };
          delete p.draft.predicateApprovalId;
          await this.update(client, id!, p.draft);
          return { predicate: definition };
        }
        if (action === 'approve') {
          const ref = z
            .strictObject({
              id: Id,
              version: z.int().positive(),
              hash: z.string().regex(/^[a-f0-9]{64}$/),
            })
            .parse(value);
          if (
            canonical(ref) !== canonical(p.draft.predicateRef) ||
            extra !== ref.id
          )
            throw Error('STALE PREVIEW');
          const approvalId = await approvePredicate(client, id!, ref);
          p.draft.predicateApprovalId = approvalId;
          await this.update(client, id!, p.draft);
          return { approvalId };
        }
        throw Error('INVALID SETUP');
      });
    });
  }
  private async runDetail(id: string) {
    return this.client(async (c) => {
      const r = await c.query<{ presentation: unknown }>(
        'SELECT presentation FROM application_runs WHERE id=$1',
        [id],
      );
      if (!r.rows[0]) throw Error('NOT FOUND');
      const record = DemoRunRecordSchema.parse(r.rows[0].presentation);
      const counters = await c.query<{
        counters: Run['budget'];
        status: string;
        stop_reason: string;
      }>('SELECT counters,status,stop_reason FROM runs WHERE id=$1', [id]);
      const persisted = counters.rows[0];
      if (persisted) {
        record.counters = {
          usedRequests: persisted.counters.usedRequests,
          requestsByPhase: persisted.counters.requestsByPhase,
          usedExplorationJourneys: persisted.counters.usedExplorationJourneys,
          modelCalls: persisted.counters.modelCalls,
          stagnantRounds: persisted.counters.stagnantRounds,
        };
        if (persisted.status === 'INTERRUPTED') {
          record.state = 'FAILED';
          record.stage = 'FAILED';
          record.stopReason = persisted.stop_reason;
          record.failure = {
            code: 'ENGINE ERROR',
            detail:
              'This run was interrupted. Start a new run; mutations were not replayed.',
          };
        }
      }
      return { run: record };
    });
  }
  private async publish(record: DemoRunRecord) {
    await this.pool.query(
      'UPDATE application_runs SET presentation=$2 WHERE id=$1',
      [record.id, DemoRunRecordSchema.parse(record)],
    );
  }
  private async start(id: string, input: z.infer<typeof StartInputSchema>) {
    if (this.stopping) throw Error('APPLICATION UNAVAILABLE');
    if (this.live) throw Error('ANOTHER RUN IN PROGRESS');
    const live: Live = {
      id: randomUUID(),
      projectId: id,
      done: Promise.resolve(),
    };
    this.live = live;
    let client: PoolClient | undefined;
    try {
      await this.modelReady();
      if (this.stopping) throw Error('APPLICATION UNAVAILABLE');
      client = await this.pool.connect();
      const setup = await this.setup(client, id);
      const stored = await client.query<{
        details: Preview;
        subject_hash: string;
      }>(
        "SELECT details,subject_hash FROM approvals WHERE id=$1 AND project_id=$2 AND kind='SCOPE_PREVIEW'",
        [input.previewId, id],
      );
      const preview = stored.rows[0]?.details;
      if (
        !preview ||
        preview.fingerprint !== setup.fingerprint ||
        preview.approvalHash !== input.approvalHash ||
        stored.rows[0]?.subject_hash !== input.approvalHash ||
        Date.parse(preview.expiresAt) < Date.now()
      )
        throw Error('STALE PREVIEW');
      const run = RunSchema.parse({
        id: live.id,
        projectId: id,
        apiSnapshot: setup.api,
        scope: preview.scope,
        reset: setup.reset,
        predicates: [setup.invariant],
        budget: new BudgetManager(setup.p.draft.limits).snapshot(),
        status: 'ACCEPTED',
        credentialBindings: setup.p.draft.credentialBindings,
        modelConfiguration: {
          provider: 'gemini',
          model: this.config.geminiModel,
        },
      });
      await client.query(
        "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE',$3,$4) ON CONFLICT(id) DO NOTHING",
        [run.scope.approvalId, id, run.apiSnapshot.contentHash, run.scope],
      );
      const record = DemoRunRecordSchema.parse({
        id: live.id,
        projectId: id,
        projectName: setup.p.name,
        fixtureId: 'custom',
        mode: 'LIVE',
        state: 'QUEUED',
        stage: 'ADMITTING RUN',
        outcome: 'PENDING',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        counters: null,
        stopReason: null,
        finding: null,
        failure: null,
        reportAvailable: false,
      });
      await client.query(
        'INSERT INTO application_runs(id,project_id,presentation) VALUES($1,$2,$3)',
        [live.id, id, record],
      );
      let accepted!: () => void, rejected!: (error: unknown) => void;
      const admitted = new Promise<void>((resolve, reject) => {
        accepted = resolve;
        rejected = reject;
      });
      const executionClient = client;
      live.done = this.execute(
        live,
        executionClient,
        run,
        record,
        accepted,
        rejected,
      );
      client = undefined;
      await admitted;
      return { run: record };
    } catch (error) {
      client?.release();
      if (this.live === live) this.live = undefined;
      throw error;
    }
  }
  private async execute(
    live: Live,
    client: PoolClient,
    run: Run,
    record: DemoRunRecord,
    accepted: () => void,
    rejected: (error: unknown) => void,
  ) {
    let writes = Promise.resolve();
    const stage = (name: DemoRunRecord['stage']) => {
      record.stage = name;
      writes = writes.then(() => this.publish({ ...record }));
    };
    try {
      const result = await runVerticalSlice(
        client,
        run,
        this.providerFactory(),
        {},
        new CredentialStore(client, this.config.credentialKey),
        true,
        true,
        (next) => {
          const stages: Record<string, DemoRunRecord['stage']> = {
            DISCOVERY: 'PLANNING JOURNEY',
            CONFIRMATION: 'CONFIRMING FROM FRESH STATE',
            MINIMIZATION: 'MINIMIZING',
            REPORT_GENERATION: 'GENERATING REPORT',
            SUPERVISED_VERIFICATION: 'VERIFYING ARTIFACT',
          };
          if (stages[next]) stage(stages[next]);
        },
        {
          supervisor: (s) => {
            live.supervisor = s;
            if (this.stopping) s.closeGate('SHUTDOWN');
          },
          accepted: () => {
            record.state = 'RUNNING';
            accepted();
          },
        },
      );
      record.stopReason = result.stopReason;
      record.finishedAt = new Date().toISOString();
      record.state = terminalFailure.has(result.stopReason)
        ? 'FAILED'
        : 'SUCCEEDED';
      record.stage = record.state === 'FAILED' ? 'FAILED' : 'COMPLETE';
      record.outcome = result.trials.some((t) => t.outcome === 'SATISFIED')
        ? 'NO CONFIRMED VIOLATION'
        : 'NOT EVALUABLE';
      if (record.state === 'FAILED') {
        let telemetry: unknown;
        if (
          result.stopReason === 'MODEL ERROR' ||
          result.stopReason === 'MODEL PLAN ERROR'
        ) {
          const diagnostic = await client.query<{
            evaluation: { telemetry?: unknown };
          }>(
            "SELECT evaluation FROM evidence WHERE run_id=$1 AND kind='PLANNING RESULT' ORDER BY created_at DESC LIMIT 1",
            [run.id],
          );
          telemetry = diagnostic.rows[0]?.evaluation.telemetry;
        }
        record.failure = runFailure(result.stopReason, telemetry);
      }
      if ('verification' in result && result.verification) {
        const f = result.verification.finding;
        record.finding = {
          id: f.id,
          classification: f.classification,
          consistent: f.consistent,
          predicateSourceRef: run.predicates[0]!.sourceRef,
          predicateHash: f.predicateRef.hash,
          originalLength: null,
          minimizedLength: null,
          minimizationStop: null,
          artifactStatus: null,
        };
        record.outcome =
          f.classification === 'CONFIRMED' && f.consistent
            ? 'VIOLATION CONFIRMED'
            : 'NO CONFIRMED VIOLATION';
      }
      if ('reproduction' in result && result.reproduction) {
        const r = result.reproduction;
        record.reportAvailable = true;
        if (record.finding) {
          record.finding.originalLength = r.minimization.originalLength;
          record.finding.minimizedLength = r.minimization.bestLength;
          record.finding.minimizationStop = r.minimization.stopReason;
          record.finding.artifactStatus = r.supervised.artifact.verification;
        }
        await this.pool.query(
          'UPDATE application_runs SET report_markdown=$2,report_json=$3,bundle=$4 WHERE id=$1',
          [run.id, r.reports.markdown, JSON.parse(r.reports.json), r.bundle],
        );
      }
      await writes;
      await this.publish(record);
    } catch (error) {
      rejected(error);
      record.state = 'FAILED';
      record.stage = 'FAILED';
      record.finishedAt = new Date().toISOString();
      record.stopReason = live.supervisor?.stopReason ?? 'STORAGE ERROR';
      record.failure = {
        code: 'ENGINE ERROR',
        detail:
          'The supervised run could not complete. No automatic retry was performed.',
      };
      try {
        await writes;
        await this.publish(record);
      } catch {
        /* Database failure is not success. */
      }
    } finally {
      client.release();
      if (this.live === live) this.live = undefined;
    }
  }
  async recover() {
    const client = await this.pool.connect();
    try {
      const supervisor = await RunSupervisor.acquire(client);
      try {
        await client.query(
          `UPDATE application_runs SET presentation = presentation || jsonb_build_object('state','FAILED','stage','FAILED','stopReason','INTERRUPTED','outcome','NOT EVALUABLE','finishedAt',now()::text,'failure',jsonb_build_object('code','ENGINE ERROR','detail','The process stopped. This run will not be resumed or replayed automatically.')) WHERE presentation->>'state' NOT IN ('SUCCEEDED','FAILED')`,
        );
      } finally {
        await supervisor.shutdown();
      }
    } finally {
      client.release();
    }
  }
  private stopping = false;
  async shutdown() {
    this.stopping = true;
    this.live?.supervisor?.closeGate('SHUTDOWN');
    await this.live?.done;
    await this.pool.end();
  }
}
export function createApplication() {
  const config = readConfig(process.env);
  return new ApplicationController(createDatabase(config.databaseUrl), config);
}
