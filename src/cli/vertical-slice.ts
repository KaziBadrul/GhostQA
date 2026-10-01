import type { ReproductionProgress } from './reproduction-progress';
import { randomUUID } from 'node:crypto';
import { canonical } from '../engine/detection/predicate';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
  JsonSchema,
  RunSchema,
  type Run,
  type Json,
} from '../engine/contracts';
import { validateFrozenScope } from '../engine/policy/scope';
import { replayCandidate } from '../engine/verification/replay';
import {
  loadFindingJourney,
  loadTrialEvidence,
  verificationApprovals,
} from '../server/repositories/findings';
import { minimizeFinding } from '../engine/minimization/greedy';
import { generateReport } from '../engine/exports/report';
import { generateManifest } from '../engine/exports/manifest';
import { verifyArtifact } from '../engine/exports/verify';
import { createRegressionBundle } from '../engine/exports/bundle';
import { explore } from '../engine/session/explore';
import type { ReasoningProvider } from '../engine/planning/provider';
import { createGeminiProvider } from '../engine/planning/gemini';
import { RunSupervisor } from '../server/run-supervisor';
import { createDatabase } from '../server/db';
import { readConfig, loadLocalEnvironment } from '../server/config';
import { CredentialStore } from '../server/credential-store';
import type { PoolClient } from 'pg';

export const VerticalSliceConfiguration = z.strictObject({
  run: RunSchema,
  inputs: z.record(z.string(), JsonSchema).default({}),
});
// Explicit owner approval, not a model decision. The supplied frozen policy is
// displayed by the CLI before approval; no destination is inferred from a fixture.
export async function runVerticalSlice(
  client: PoolClient,
  run: Run,
  provider: ReasoningProvider,
  inputs: Record<string, Json>,
  credentials?: CredentialStore,
  verify = false,
  reproduce = false,
  onProgress?: ReproductionProgress,
) {
  const progress: ReproductionProgress = (stage, completed) => {
    if (reproduce) onProgress?.(stage, completed);
  };
  progress('RUN_ADMISSION', false);
  validateFrozenScope(run.scope);
  const approval = await client.query(
    "SELECT id FROM approvals WHERE id=$1 AND project_id=$2 AND kind='SCOPE' AND details=$3::jsonb",
    [run.scope.approvalId, run.projectId, run.scope],
  );
  if (approval.rowCount !== 1) throw new Error('SCOPE APPROVAL REQUIRED');
  const supervisor = await RunSupervisor.acquire(client, credentials);
  const cancel = () => supervisor.cancel();
  process.on('SIGINT', cancel);
  process.on('SIGTERM', cancel);
  try {
    await supervisor.accept(run);
    progress('RUN_ADMISSION', true);
    progress('DISCOVERY', false);
    const budgetSnapshots = reproduce
      ? [{ stage: 'ACCEPTED', budget: supervisor.snapshot.budget }]
      : [];
    const discovery =
      verify || reproduce
        ? await explore(supervisor, provider, inputs, true)
        : await explore(supervisor, provider, inputs);
    if (!(verify || reproduce) || !discovery.candidate) return discovery;
    progress('DISCOVERY', true);
    progress('CONFIRMATION', false);
    if (reproduce)
      budgetSnapshots.push({
        stage: 'DISCOVERY',
        budget: supervisor.snapshot.budget,
      });
    const active = supervisor.snapshot;
    const journey = await loadFindingJourney(
      client,
      active,
      discovery.candidate,
    );
    const verification = await replayCandidate(
      supervisor,
      active,
      journey,
      discovery.candidate,
      inputs,
    );
    if (
      verification.finding.classification === 'CONFIRMED' &&
      verification.finding.consistent
    )
      progress('CONFIRMATION', true);
    if (
      reproduce &&
      verification.finding.classification === 'CONFIRMED' &&
      verification.finding.consistent
    ) {
      budgetSnapshots.push({
        stage: 'CONFIRMED',
        budget: supervisor.snapshot.budget,
      });
      progress('MINIMIZATION', false);
      const minimization = await minimizeFinding(
        supervisor,
        supervisor.snapshot,
        journey,
        verification.finding,
        inputs,
      );
      progress('MINIMIZATION', true);
      budgetSnapshots.push({
        stage: 'MINIMIZED',
        budget: supervisor.snapshot.budget,
      });
      progress('EVIDENCE_LOADING', false);
      const current = supervisor.snapshot;
      const initial = await loadTrialEvidence(
        client,
        current,
        minimization.finding.initialEvidenceId,
        'EXPLORATION',
        journey,
      );
      const replays = await Promise.all(
        minimization.finding.replayEvidenceIds.map((id) =>
          loadTrialEvidence(client, current, id, 'REPLAY', journey),
        ),
      );
      const eligibility = await verificationApprovals(
        client,
        current,
        minimization.finding,
      );
      const source = {
        run: current,
        original: journey,
        minimization,
        initial,
        replays,
        approvals: eligibility.replayApprovals,
        specificationAssertions: eligibility.specificationAssertions,
        artifactId: randomUUID(),
        generatedAt: new Date().toISOString(),
        runnerVersion: 'manifest-v1',
      };
      progress('EVIDENCE_LOADING', true);
      progress('REPORT_GENERATION', false);
      const reports = generateReport(source);
      progress('REPORT_GENERATION', true);
      progress('MANIFEST_GENERATION', false);
      const generated = generateManifest(source);
      progress('MANIFEST_GENERATION', true);
      progress('SUPERVISED_VERIFICATION', false);
      const supervised = await verifyArtifact(
        supervisor,
        current,
        generated,
        inputs,
      );
      if (supervised.artifact.verification === 'VERIFIED')
        progress('SUPERVISED_VERIFICATION', true);
      budgetSnapshots.push({
        stage: 'ARTIFACT',
        budget: supervisor.snapshot.budget,
      });
      progress('PREDICATE_IDENTITY', false);
      const refs = [
        discovery.candidate.predicateRef,
        verification.evidence.predicateRef,
        minimization.finding.predicateRef,
        minimization.best.predicateRef,
        generated.manifest.predicateRef,
        ...(supervised.evidence ? [supervised.evidence.predicateRef] : []),
      ];
      if (
        refs.some(
          (ref) => canonical(ref) !== canonical(journey.predicateRef),
        ) ||
        canonical(JSON.parse(reports.json).predicateRef) !==
          canonical(journey.predicateRef)
      )
        throw new Error('REPRODUCTION IDENTITY MISMATCH');
      progress('PREDICATE_IDENTITY', true);
      progress('BUNDLE_GENERATION', false);
      const bundle = await createRegressionBundle(
        generated.manifest,
        generated.artifact.manifestHash,
      );
      progress('BUNDLE_GENERATION', true);
      progress('BUNDLE_ISOLATION', false);
      if (
        bundle.inputs.some((path) =>
          /http-executor|src\/server\/|planning\/|node_modules\/(?:pg|@google)\//.test(
            path,
          ),
        )
      )
        throw new Error('BUNDLE ISOLATION ERROR');
      progress('BUNDLE_ISOLATION', true);
      progress('RUN_COMPLETION', false);
      const stopReason =
        supervised.artifact.verification === 'VERIFIED'
          ? 'REPRODUCTION COMPLETE'
          : supervised.reason;
      await supervisor.stop(stopReason);
      progress('RUN_COMPLETION', true);
      return {
        ...discovery,
        stopReason,
        verification,
        reproduction: {
          minimization,
          initial,
          replays,
          reports,
          generated,
          supervised,
          bundle,
          budgetSnapshots,
          finalBudget: supervisor.snapshot.budget,
        },
      };
    }
    const stopReason =
      verification.finding.classification === 'CONFIRMED' &&
      verification.finding.consistent
        ? 'DISCOVERY COMPLETE'
        : 'VERIFICATION COMPLETE';
    await supervisor.stop(stopReason);
    return { ...discovery, stopReason, verification };
  } finally {
    process.off('SIGINT', cancel);
    process.off('SIGTERM', cancel);
    await supervisor.shutdown();
  }
}

export async function main(args: string[]) {
  if (
    args.length < 1 ||
    args.length > 4 ||
    args
      .slice(1)
      .some(
        (arg) => !['--approve-scope', '--verify', '--reproduce'].includes(arg),
      ) ||
    new Set(args.slice(1)).size !== args.length - 1
  )
    throw new Error(
      'USAGE: vertical-slice <configuration.json> [--approve-scope] [--verify] [--reproduce]',
    );
  const { run, inputs } = VerticalSliceConfiguration.parse(
    JSON.parse(await readFile(args[0]!, 'utf8')),
  );
  validateFrozenScope(run.scope);
  // Preview contains scope/phase policy only, never configured inputs or secrets.
  console.log(JSON.stringify({ scope: run.scope }, null, 2));
  if (!args.includes('--approve-scope')) return;
  loadLocalEnvironment();
  const config = readConfig(process.env);
  run.modelConfiguration = { provider: 'gemini', model: config.geminiModel };
  const pool = createDatabase(config.databaseUrl);
  const client = await pool.connect();
  try {
    const project = await client.query('SELECT id FROM projects WHERE id=$1', [
      run.projectId,
    ]);
    if (project.rowCount !== 1) throw new Error('PROJECT REQUIRED');
    await client.query(
      "INSERT INTO approvals(id,project_id,kind,subject_hash,details) VALUES($1,$2,'SCOPE',$3,$4) ON CONFLICT(id) DO NOTHING",
      [
        run.scope.approvalId,
        run.projectId,
        run.apiSnapshot.contentHash,
        run.scope,
      ],
    );
    const result = await runVerticalSlice(
      client,
      run,
      createGeminiProvider({
        model: config.geminiModel,
        apiKey: config.geminiApiKey,
        requestsPerMinute: config.geminiRequestsPerMinute,
      }),
      inputs,
      new CredentialStore(client, config.credentialKey),
      args.includes('--verify'),
      args.includes('--reproduce'),
    );
    console.log(
      JSON.stringify({
        stopReason: result.stopReason,
        evidenceIds: result.trials.map((e) => e.id),
        ...('reproduction' in result && result.reproduction
          ? {
              manifestHash: result.reproduction.generated.artifact.manifestHash,
              packageHash: result.reproduction.bundle.packageHash,
              artifactStatus:
                result.reproduction.supervised.artifact.verification,
              originalLength: result.reproduction.minimization.originalLength,
              bestLength: result.reproduction.minimization.bestLength,
              usedRequests: result.reproduction.finalBudget.usedRequests,
            }
          : {}),
        ...('verification' in result && result.verification
          ? {
              replayEvidenceId: result.verification.evidence.id,
              replayBaselineId: result.verification.baseline.id,
              findingId: result.verification.finding.id,
              classification: result.verification.finding.classification,
              consistent: result.verification.finding.consistent,
            }
          : {}),
      }),
    );
  } finally {
    client.release();
    await pool.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  void main(process.argv.slice(2)).catch((error) => {
    console.error('VERTICAL SLICE FAILED', error);
    process.exitCode = 1;
  });
