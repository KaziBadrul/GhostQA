import { randomUUID, createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { RegressionArtifactSchema } from '../../src/engine/contracts';
import { canonical, predicateHash } from '../../src/engine/detection/predicate';
import { SecretVault } from '../../src/engine/secrets/vault';
import { validateJourney } from '../../src/engine/validation/journey';
import {
  ManifestSchema,
  exportCase,
  manifestBoundary,
  reportBoundary,
  type ExportInput,
} from '../helpers/artifact';

// Load production boundary before rejection assertions: missing imports are never
// accepted as evidence that invalid data was safely rejected.
test('setup: export input is a confirmed six-to-three same-predicate order reproducer', async () => {
  const c = await exportCase();
  expect(c.minimization.finding.classification).toBe('CONFIRMED');
  expect(c.minimization.best.steps.map((s) => s.id)).toEqual([
    'create',
    'cancelled',
    'later',
  ]);
  expect(c.minimization.best.predicateRef).toEqual(c.original.predicateRef);
  expect(() =>
    validateJourney(
      c.minimization.best,
      c.run.apiSnapshot,
      c.run.scope,
      'ARTIFACT',
    ),
  ).not.toThrow();
});
test('setup: existing artifact status contract rejects VERIFIED without evidence', async () => {
  const c = await exportCase();
  const scopeTemplate = { ...c.run.scope };
  Reflect.deleteProperty(scopeTemplate, 'addresses');
  Reflect.deleteProperty(scopeTemplate, 'approvalId');
  const artifact = {
    id: c.artifactId,
    findingId: c.minimization.finding.id,
    formatVersion: 1,
    contentHash: 'a'.repeat(64),
    manifestHash: 'a'.repeat(64),
    journey: c.minimization.best,
    predicate: c.run.predicates[0],
    reset: c.run.reset,
    apiModel: c.run.apiSnapshot,
    scopeTemplate,
    credentialSlots: [],
    generatedAt: c.generatedAt,
    verification: 'UNVERIFIED',
    verificationEvidenceIds: [],
    verificationAuthority: 'SUPERVISED_RUN_PATH',
    generationState: 'GENERATED',
    runnerVersion: c.runnerVersion,
  };
  expect(RegressionArtifactSchema.safeParse(artifact).success).toBe(true);
  expect(
    RegressionArtifactSchema.safeParse({
      ...artifact,
      verification: 'VERIFIED',
    }).success,
  ).toBe(false);
});
test('setup: each supplied reduction retains an independent baseline and exact violation', async () => {
  const c = await exportCase();
  const trials = [c.initial, ...c.replays, ...c.minimization.attempts];
  expect(new Set(trials.map((t) => t.evidence!.trialId)).size).toBe(5);
  expect(new Set(trials.map((t) => t.baseline!.id)).size).toBe(5);
  expect(trials.every((t) => t.evidence!.outcome === 'VIOLATED')).toBe(true);
});
test('T041: manifest preserves exact executable reset, predicate, assertions, journey and provenance', async () => {
  const api = await manifestBoundary(),
    c = await exportCase();
  const generated = api.generateManifest(c),
    m = ManifestSchema.parse(generated.manifest);
  expect(m.formatVersion).toBe(1);
  expect(m.runnerVersion).toBe(c.runnerVersion);
  expect(m.reset).toEqual(c.run.reset);
  expect(m.journey).toEqual(c.minimization.best);
  expect(m.predicate).toEqual(c.run.predicates[0]);
  expect(m.assertions).toEqual(c.run.predicates[0]!.assertions);
  expect(m.predicateRef).toEqual(c.minimization.finding.predicateRef);
  expect(m.apiModel).toEqual(c.run.apiSnapshot);
  expect(m.provenance).toEqual({
    runId: c.run.id,
    findingId: c.minimization.finding.id,
    originalJourneyId: c.original.id,
    bestJourneyId: c.minimization.best.id,
    initialEvidenceId: c.initial.evidence.id,
    replayEvidenceIds: c.replays.map((t) => t.evidence.id),
    baselineEvidenceIds: [
      c.initial.baseline.id,
      ...c.replays.map((t) => t.baseline.id),
      ...c.minimization.attempts
        .filter((a) => a.baseline)
        .map((a) => a.baseline!.id),
    ],
    minimizationEvidenceIds: c.minimization.attempts
      .filter((a) => a.evidence)
      .map((a) => a.evidence!.id),
  });
  expect(JSON.parse(generated.bytes)).toEqual(m);
  expect(generated.bytes).toBe(canonical(m));
  expect(api.manifestHash(m)).toBe(
    createHash('sha256').update(canonical(m)).digest('hex'),
  );
  expect(generated.artifact.manifestHash).toBe(api.manifestHash(m));
  expect(RegressionArtifactSchema.parse(generated.artifact)).toMatchObject({
    generationState: 'GENERATED',
    verification: 'UNVERIFIED',
    verificationEvidenceIds: [],
    findingId: c.minimization.finding.id,
    journey: m.journey,
    predicate: m.predicate,
    reset: m.reset,
  });
});
test('T041: manifest exports scope expectations but no active destination/address approval', async () => {
  const api = await manifestBoundary(),
    c = await exportCase(),
    m = api.generateManifest(c).manifest;
  expect(m.scopeTemplate).toMatchObject({
    origin: c.run.scope.origin,
    basePathSegments: c.run.scope.basePathSegments,
    operationIds: c.run.scope.operationIds,
    operationPolicy: c.run.scope.operationPolicy,
  });
  expect(m.scopeTemplate).not.toHaveProperty('addresses');
  expect(m.scopeTemplate).not.toHaveProperty('approvalId');
  expect(
    m.apiModel.operations.map((o) => [o.id, o.method, o.pathTemplate]),
  ).toEqual(
    c.run.apiSnapshot.operations.map((o) => [o.id, o.method, o.pathTemplate]),
  );
  for (const name of [
    'budget',
    'modelConfiguration',
    'signal',
    'databaseUrl',
    'worker',
  ])
    expect(m).not.toHaveProperty(name);
});
test('T041: object insertion order cannot change canonical bytes or identity', async () => {
  const api = await manifestBoundary(),
    c = await exportCase(),
    m = api.generateManifest(c).manifest;
  const reversed = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(reversed)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .reverse()
              .map(([k, x]) => [k, reversed(x)]),
          )
        : v;
  expect(api.manifestHash(reversed(m))).toBe(api.manifestHash(m));
  expect(api.generateManifest(c)).toEqual(
    api.generateManifest(structuredClone(c)),
  );
});
test('T041: metadata changes do not alter executable manifest identity', async () => {
  const api = await manifestBoundary(),
    c = await exportCase(),
    first = api.generateManifest(c);
  c.artifactId = randomUUID();
  c.generatedAt = '2026-10-02T00:00:00.000Z';
  expect(api.generateManifest(c).bytes).toBe(first.bytes);
});
for (const field of [
  'reset',
  'journey',
  'predicate',
  'assertions',
  'runnerVersion',
  'scope',
  'credentialSlots',
  'provenance',
] as const)
  test(`T041: relevant ${field} mutation changes hash or is rejected`, async () => {
    const api = await manifestBoundary(),
      c = await exportCase(),
      m = api.generateManifest(c).manifest,
      old = api.manifestHash(m);
    if (field === 'reset') m.reset.version++;
    if (field === 'journey') m.journey.steps[0]!.expectedStatuses.push(202);
    if (field === 'predicate') {
      m.predicate.version++;
      m.predicateRef.version++;
    }
    if (field === 'assertions') m.assertions[0]!.op = 'equals';
    if (field === 'runnerVersion') m.runnerVersion = 'manifest-v2';
    if (field === 'scope') m.scopeTemplate.origin = 'http://127.0.0.1:34568';
    if (field === 'credentialSlots') {
      m.credentialSlots.push('new-slot');
      m.credentialBindings.push({
        slot: 'new-slot',
        kind: 'api-key',
        location: 'header',
        name: 'X-Key',
      });
    }
    if (field === 'provenance') m.provenance.initialEvidenceId = randomUUID();
    let hash;
    try {
      hash = api.manifestHash(m);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      return;
    }
    expect(hash).not.toBe(old);
  });
const invalid: [string, (c: ExportInput) => void][] = [
  [
    'predicate ID',
    (c) => {
      c.minimization.best.predicateRef.id = randomUUID();
    },
  ],
  [
    'predicate version',
    (c) => {
      c.minimization.best.predicateRef.version++;
    },
  ],
  [
    'predicate hash',
    (c) => {
      c.minimization.best.predicateRef.hash = '0'.repeat(64);
    },
  ],
  [
    'edited approved definition',
    (c) => {
      c.run.predicates[0]!.assertions[0]!.op = 'equals';
    },
  ],
  [
    'unapproved hypothesis',
    (c) => {
      c.run.predicates[0]!.source = 'AGENT_HYPOTHESIS';
    },
  ],
  [
    'unconfirmed finding',
    (c) => {
      c.minimization.finding.classification = 'OBSERVED VIOLATION';
    },
  ],
  [
    'inconsistent confirmation',
    (c) => {
      c.minimization.finding.consistent = false;
    },
  ],
  [
    'missing replay',
    (c) => {
      c.replays = [];
    },
  ],
  [
    'reused discovery evidence',
    (c) => {
      c.replays = [c.initial];
    },
  ],
  [
    'wrong original journey',
    (c) => {
      c.original.id = randomUUID();
    },
  ],
  [
    'unverified best',
    (c) => {
      c.minimization.attempts = [];
    },
  ],
  [
    'wrong reported length',
    (c) => {
      c.minimization.bestLength = 2;
    },
  ],
  [
    'unknown operation',
    (c) => {
      c.minimization.best.steps[0]!.operationId = 'POST /escape';
    },
  ],
  [
    'missing producer',
    (c) => {
      c.minimization.best.steps.shift();
    },
  ],
];
for (const [name, mutate] of invalid)
  test(`T041: ${name} cannot generate an executable artifact`, async () => {
    const api = await manifestBoundary(),
      c = await exportCase();
    mutate(c);
    const before = structuredClone(c);
    expect(() => api.generateManifest(c)).toThrow();
    expect(c).toEqual(before);
  });
test('T041: symbolic credential bindings omit credential versions/values and remain stable', async () => {
  const api = await manifestBoundary(),
    c = await exportCase();
  c.run.credentialBindings = [
    {
      slot: 'service',
      version: 2,
      kind: 'bearer',
      location: 'header',
      name: 'Authorization',
    },
  ];
  const m = api.generateManifest(c).manifest;
  expect(m.credentialSlots).toEqual(['service']);
  expect(m.credentialBindings).toEqual([
    {
      slot: 'service',
      kind: 'bearer',
      location: 'header',
      name: 'Authorization',
    },
  ]);
  c.run.credentialBindings[0]!.version = 3;
  expect(api.generateManifest(c).manifest).toEqual(m);
});
for (const location of ['journey', 'reset', 'predicate', 'api'] as const)
  test(`T041: known secret in executable ${location} fails closed without copying or silently rewriting`, async () => {
    const api = await manifestBoundary(),
      c = await exportCase(),
      vault = new SecretVault(),
      secret = 'sentinel-export-secret-91';
    vault.register(secret);
    if (location === 'journey') c.minimization.best.rationale = secret;
    if (location === 'reset')
      c.run.reset.resetSteps[0]!.body = { password: secret };
    if (location === 'predicate') {
      c.run.predicates[0]!.assertions.push({
        op: 'equals',
        left: { kind: 'literal', value: secret },
        right: { kind: 'literal', value: secret },
      });
      c.run.predicates[0]!.canonicalHash = predicateHash(c.run.predicates[0]);
    }
    if (location === 'api')
      c.run.apiSnapshot.operations[0]!.sanitizedDescription = secret;
    const before = structuredClone(c);
    expect(() => api.generateManifest(c, vault)).toThrow();
    expect(c).toEqual(before);
  });
test('T041: manifest hash rejects unknown fields and non-JSON values', async () => {
  const api = await manifestBoundary(),
    c = await exportCase(),
    m = api.generateManifest(c).manifest;
  for (const extra of [
    { secret: 'raw' },
    { authority: 'Gemini' },
    { callback: () => {} },
    { budget: Infinity },
  ])
    expect(() => api.manifestHash({ ...m, ...extra })).toThrow();
  expect(() => api.manifestHash({ ...m, runnerVersion: undefined })).toThrow();
});
test('T041: read-only generation cannot mutate predicate/reset/journeys or historical evidence', async () => {
  const api = await manifestBoundary(),
    reports = await reportBoundary(),
    c = await exportCase(),
    before = structuredClone(c);
  const generated = api.generateManifest(c);
  reports.generateReport(c);
  generated.manifest.journey.steps[0]!.id = 'tampered';
  generated.artifact.reset.version++;
  expect(c).toEqual(before);
});
test('T041: deterministic Markdown/JSON report includes honest complete evidence chain', async () => {
  const api = await reportBoundary(),
    c = await exportCase(),
    a = api.generateReport(c),
    b = api.generateReport(structuredClone(c));
  expect(a).toEqual(b);
  const r = JSON.parse(a.json);
  expect(r.finding).toEqual(c.minimization.finding);
  expect(r.predicate).toEqual(c.run.predicates[0]);
  expect(r.predicateRef).toEqual(c.original.predicateRef);
  expect(r.approval).toMatchObject({
    source: 'DEVELOPER',
    sourceRef: c.run.predicates[0]!.sourceRef,
  });
  expect(r.originalLength).toBe(6);
  expect(r.bestLength).toBe(3);
  expect(r.initial).toEqual(c.initial);
  expect(r.replays).toEqual(c.replays);
  expect(r.minimization).toEqual(c.minimization);
  expect(r.truncated).toBe(false);
  expect(r.stopReason).toBe('LOCAL MINIMUM');
  expect(r.verification).toBe('UNVERIFIED');
  expect(r.generationState).toBe('GENERATED');
  for (const text of [
    'OBSERVED VIOLATION',
    'CONFIRMED',
    'UNVERIFIED',
    '6',
    '3',
    c.initial.baseline.id,
    c.replays[0]!.baseline.id,
    c.original.predicateRef.id,
    c.original.predicateRef.hash,
    'shortest verified sequence found',
  ])
    expect(a.markdown).toContain(text);
  expect(a.markdown).not.toMatch(/globally (minimal|shortest)|global minimum/i);
});
for (const reason of [
  'BUDGET EXHAUSTED',
  'CANCELLED',
  'EXECUTION ERROR',
] as const)
  test(`T041: report retains best and honestly states ${reason}, truncation and rejected attempt`, async () => {
    const api = await reportBoundary(),
      c = await exportCase();
    c.minimization.stopReason = reason;
    c.minimization.finding.minimizationStop = reason;
    c.minimization.locallyIrreducible = false;
    c.minimization.attempts.push({
      candidate: structuredClone(c.minimization.best),
      removedStepId: 'later',
      accepted: false,
      reason,
      executionOutcome: reason,
      observations: [
        {
          ...structuredClone(c.initial.observations[0]!),
          result: {
            ...c.initial.observations[0]!.result,
            truncated: true,
            outcome: 'INTERRUPTED',
          },
        },
      ],
    });
    const r = api.generateReport(c);
    expect(JSON.parse(r.json)).toMatchObject({
      bestLength: 3,
      truncated: true,
      stopReason: reason,
    });
    expect(r.markdown).toContain(reason);
    expect(r.markdown).toContain('Truncated: yes');
    expect(r.markdown).not.toContain(
      'locally irreducible under attempted deletion strategy',
    );
  });
for (const name of ['password', 'authorization', 'api_key', 'cookie'])
  test(`T041: report redacts classified ${name} and echoed/encoded values`, async () => {
    const api = await reportBoundary(),
      c = await exportCase(),
      secret = 'secret sentinel / 13';
    c.initial.observations[0]!.result.sanitizedResponse = {
      [name]: secret,
      echo: secret,
      encoded: encodeURIComponent(secret),
    };
    const r = api.generateReport(c),
      combined = r.json + r.markdown;
    expect(combined).not.toContain(secret);
    expect(combined).not.toContain(encodeURIComponent(secret));
    expect(c.initial.observations[0]!.result.sanitizedResponse).toHaveProperty(
      name,
      secret,
    );
  });
test('T041: configured vault secret echoed in report prose is sanitized without changing identity', async () => {
  const api = await reportBoundary(),
    c = await exportCase(),
    vault = new SecretVault(),
    secret = 'known configured credential 53';
  vault.register(secret);
  c.initial.evidence.reason = secret;
  const r = api.generateReport(c, vault);
  expect(r.json + r.markdown).not.toContain(secret);
  expect(JSON.parse(r.json).predicateRef).toEqual(c.original.predicateRef);
});
