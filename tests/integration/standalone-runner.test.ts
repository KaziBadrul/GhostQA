import { createHash } from 'node:crypto';
import { createServer, type RequestListener } from 'node:http';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';
import { startOrderFixture } from '../../fixtures/api/order-lifecycle';
import {
  runRegression,
  requiredOperations,
  type Invocation,
} from '../../src/engine/exports/runner';
import { manifestHash } from '../../src/engine/exports/manifest-integrity';
import { createRegressionBundle } from '../../src/engine/exports/bundle';
import { regressionCli } from '../../src/cli/regression';
import {
  ManifestSchema,
  type Manifest,
} from '../../src/engine/exports/contracts';
import { SecretVault } from '../../src/engine/secrets/vault';
import { canonical, predicateHash } from '../../src/engine/detection/predicate';
import { exportHarness } from '../helpers/artifact';
import { history } from '../helpers/minimization';
import { generateManifest } from '../../src/engine/exports/manifest';
import { verifyArtifact } from '../../src/engine/exports/verify';

const historicalPath =
  'tests/acceptance/t042-order-82fdb889-5b6c-49bf-852f-f1b092cb394a.json';
function manifest(): Manifest {
  return ManifestSchema.parse(
    JSON.parse(readFileSync(historicalPath, 'utf8')).generated.manifest,
  );
}
function invocation(m: Manifest, target: string): Invocation {
  return {
    target: target + '/api',
    addresses: [{ ip: '127.0.0.1', family: 4 }],
    approvedOperations: requiredOperations(m),
    mutationsAcknowledged: true,
    budget: { requests: 5, milliseconds: 10000, requestTimeoutMs: 1000 },
    credentials: {},
    inputs: {},
  };
}
function cliArgs(i: Invocation) {
  return [
    '--target',
    i.target,
    ...i.addresses.flatMap((a) => ['--address', a.ip]),
    ...i.approvedOperations.flatMap((o) => ['--approve-operation', o]),
    '--ack-mutations',
    '--requests',
    String(i.budget.requests),
    '--milliseconds',
    String(i.budget.milliseconds),
    '--request-timeout-ms',
    String(i.budget.requestTimeoutMs),
  ];
}
async function countingTarget(handler?: RequestListener) {
  let calls = 0;
  const server = createServer((req, res) => {
    calls++;
    if (typeof handler === 'function') handler(req, res);
    else res.writeHead(500).end();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('TEST SERVER');
  return {
    url: `http://127.0.0.1:${addr.port}`,
    count: () => calls,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
for (const repaired of [false, true])
  test(`same historical minimized manifest independently ${repaired ? 'passes repaired' : 'fails faulty'} order fixture`, async () => {
    const m = manifest(),
      f = await startOrderFixture(repaired),
      before = canonical(m),
      historical = readFileSync(historicalPath);
    try {
      const r = await runRegression(m, manifestHash(m), invocation(m, f.url));
      expect(r.result).toBe(repaired ? 'PASS' : 'FAIL');
      expect(r).toMatchObject({
        context: 'INDEPENDENT',
        verdict: repaired ? 'SATISFIED' : 'VIOLATED',
        usedRequests: 5,
        predicateRef: m.predicateRef,
      });
      expect(r.baseline?.outcome).toBe('SATISFIED');
      expect(r.steps.map((s) => s.phase)).toEqual([
        'RESET',
        'BASELINE',
        'ARTIFACT',
        'ARTIFACT',
        'ARTIFACT',
      ]);
      expect(canonical(m)).toBe(before);
      expect(readFileSync(historicalPath)).toEqual(historical);
      expect(r).not.toHaveProperty('verification');
      expect(r).not.toHaveProperty('artifact');
    } finally {
      await f.close();
    }
  });
const refusals: [string, (i: Record<string, unknown>) => void][] = [
  [
    'missing target',
    (i) => {
      delete i.target;
    },
  ],
  [
    'missing addresses',
    (i) => {
      delete i.addresses;
    },
  ],
  [
    'empty addresses',
    (i) => {
      i.addresses = [];
    },
  ],
  [
    'wrong pinned address',
    (i) => {
      i.addresses = [{ ip: '127.0.0.2', family: 4 }];
    },
  ],
  [
    'missing operation approval',
    (i) => {
      delete i.approvedOperations;
    },
  ],
  [
    'omitted operation',
    (i) => {
      i.approvedOperations = (i.approvedOperations as string[]).slice(1);
    },
  ],
  [
    'extra operation',
    (i) => {
      (i.approvedOperations as string[]).push('GET /outside');
    },
  ],
  [
    'duplicate approval',
    (i) => {
      (i.approvedOperations as string[]).push(
        (i.approvedOperations as string[])[0]!,
      );
    },
  ],
  [
    'missing mutation acknowledgment',
    (i) => {
      delete i.mutationsAcknowledged;
    },
  ],
  [
    'unacknowledged mutation',
    (i) => {
      i.mutationsAcknowledged = false;
    },
  ],
  [
    'missing budget',
    (i) => {
      delete i.budget;
    },
  ],
  [
    'insufficient full trial budget',
    (i) => {
      (i.budget as Invocation['budget']).requests = 4;
    },
  ],
  [
    'infinite requests',
    (i) => {
      (i.budget as Invocation['budget']).requests = Infinity;
    },
  ],
  [
    'infinite time',
    (i) => {
      (i.budget as Invocation['budget']).milliseconds = Infinity;
    },
  ],
  [
    'zero timeout',
    (i) => {
      (i.budget as Invocation['budget']).requestTimeoutMs = 0;
    },
  ],
  [
    'fractional budget',
    (i) => {
      (i.budget as Invocation['budget']).requests = 5.5;
    },
  ],
  [
    'target base-path mismatch',
    (i) => {
      i.target = String(i.target) + '/broader';
    },
  ],
  [
    'URL credential',
    (i) => {
      i.target = String(i.target).replace('http://', 'http://secret:secret@');
    },
  ],
  [
    'originating capability injection',
    (i) => {
      i.supervisor = { verification: 'VERIFIED' };
    },
  ],
  [
    'unknown credential',
    (i) => {
      i.credentials = { copied: 'forbidden-sentinel-33' };
    },
  ],
];
for (const [name, change] of refusals)
  test(`${name} refuses before any target request`, async () => {
    const m = manifest(),
      f = await countingTarget();
    try {
      const i: Record<string, unknown> = { ...invocation(m, f.url) };
      change(i);
      const r = await runRegression(m, manifestHash(m), i);
      expect(r.result).toBe('ERROR');
      expect(r.usedRequests).toBe(0);
      expect(f.count()).toBe(0);
      expect(r).not.toHaveProperty('verdict');
    } finally {
      await f.close();
    }
  });
for (const field of [
  'hash',
  'format',
  'predicate id',
  'predicate version',
  'predicate hash',
  'journey',
  'reset',
  'assertion',
  'method',
  'path',
  'slot',
  'extra field',
])
  test(`tampered ${field} cannot execute`, async () => {
    const m = manifest(),
      hash = manifestHash(m),
      f = await countingTarget();
    let supplied = hash;
    if (field === 'hash') supplied = '0'.repeat(64);
    if (field === 'format') Reflect.set(m, 'formatVersion', 2);
    if (field === 'predicate id')
      m.predicate.id = '00000000-0000-4000-8000-000000000001';
    if (field === 'predicate version') m.predicate.version++;
    if (field === 'predicate hash') m.predicate.canonicalHash = '0'.repeat(64);
    if (field === 'journey') m.journey.steps.reverse();
    if (field === 'reset') m.reset.version++;
    if (field === 'assertion') m.assertions[0]!.op = 'equals';
    if (field === 'method') m.apiModel.operations[0]!.method = 'DELETE';
    if (field === 'path') m.apiModel.operations[0]!.pathTemplate = '/outside';
    if (field === 'slot') m.credentialSlots.push('copied');
    if (field === 'extra field')
      Reflect.set(m, 'originatingWriteAuthority', true);
    try {
      const r = await runRegression(m, supplied, invocation(m, f.url));
      expect(r.result).toBe('ERROR');
      expect(f.count()).toBe(0);
    } finally {
      await f.close();
    }
  });
test('internally inconsistent method/path expectations reject even with newly computed hash', async () => {
  const m = manifest(),
    o = m.apiModel.operations.find(
      (o) => o.id === m.journey.steps[0]!.operationId,
    )!;
  o.pathTemplate = '/api/unapproved';
  const f = await countingTarget();
  try {
    const r = await runRegression(m, manifestHash(m), invocation(m, f.url));
    expect(r).toMatchObject({
      result: 'ERROR',
      reason: 'OPERATION EXPECTATION ERROR',
      usedRequests: 0,
    });
    expect(f.count()).toBe(0);
  } finally {
    await f.close();
  }
});
test('reset error stops without baseline or journey and counts dispatched failure', async () => {
  const m = manifest(),
    f = await countingTarget();
  try {
    const r = await runRegression(m, manifestHash(m), invocation(m, f.url));
    expect(r).toMatchObject({
      result: 'ERROR',
      reason: 'BASELINE ERROR',
      usedRequests: 1,
    });
    expect(f.count()).toBe(1);
    expect(r.baseline).toBeUndefined();
  } finally {
    await f.close();
  }
});
test('invalid baseline prevents journey', async () => {
  const m = manifest(),
    f = await countingTarget((req, res) =>
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(
          JSON.stringify(
            req.url?.endsWith('reset') ? { reset: true } : { orders: 1 },
          ),
        ),
    );
  try {
    const r = await runRegression(m, manifestHash(m), invocation(m, f.url));
    expect(r).toMatchObject({
      result: 'ERROR',
      reason: 'BASELINE ERROR',
      usedRequests: 2,
    });
    expect(f.count()).toBe(2);
    expect(r.baseline).toBeUndefined();
  } finally {
    await f.close();
  }
});
test('pre-cancellation prevents reset and consumes nothing', async () => {
  const m = manifest(),
    f = await countingTarget(),
    a = new AbortController();
  a.abort();
  try {
    const r = await runRegression(
      m,
      manifestHash(m),
      invocation(m, f.url),
      a.signal,
    );
    expect(r).toMatchObject({ reason: 'CANCELLED', usedRequests: 0 });
    expect(f.count()).toBe(0);
  } finally {
    await f.close();
  }
});
test('cancellation aborts an in-flight request and never schedules cleanup', async () => {
  const m = manifest(),
    a = new AbortController(),
    f = await countingTarget(() => a.abort());
  try {
    const r = await runRegression(
      m,
      manifestHash(m),
      invocation(m, f.url),
      a.signal,
    );
    expect(r).toMatchObject({ reason: 'CANCELLED', usedRequests: 1 });
    expect(f.count()).toBe(1);
  } finally {
    await f.close();
  }
});
test('finite elapsed budget ends a stalled reset without retry', async () => {
  const m = manifest(),
    f = await countingTarget(() => {}),
    i = invocation(m, f.url);
  i.budget.milliseconds = 20;
  try {
    const r = await runRegression(m, manifestHash(m), i);
    expect(r.result).toBe('ERROR');
    expect(r.usedRequests).toBe(1);
    expect(f.count()).toBe(1);
    expect(r).not.toHaveProperty('verdict');
  } finally {
    await f.close();
  }
});
test('each invocation establishes its own baseline and independent budget', async () => {
  const m = manifest(),
    f = await startOrderFixture(false);
  try {
    const a = await runRegression(m, manifestHash(m), invocation(m, f.url)),
      b = await runRegression(m, manifestHash(m), invocation(m, f.url));
    expect(a.result).toBe('FAIL');
    expect(b.result).toBe('FAIL');
    expect(a.trialId).not.toBe(b.trialId);
    expect(a.baseline?.id).not.toBe(b.baseline?.id);
    expect(a.usedRequests).toBe(5);
    expect(b.usedRequests).toBe(5);
  } finally {
    await f.close();
  }
});
function credentialManifest() {
  const m = manifest();
  m.credentialSlots = ['service'];
  m.credentialBindings = [
    {
      slot: 'service',
      kind: 'bearer',
      location: 'header',
      name: 'Authorization',
    },
  ];
  return m;
}
test('missing required symbolic slot refuses before reset', async () => {
  const m = credentialManifest(),
    f = await countingTarget();
  try {
    const r = await runRegression(m, manifestHash(m), invocation(m, f.url));
    expect(r).toMatchObject({
      reason: 'CREDENTIAL UNAVAILABLE',
      usedRequests: 0,
    });
    expect(f.count()).toBe(0);
  } finally {
    await f.close();
  }
});
test('protected credential injection reaches authorized header and never enters results', async () => {
  const m = credentialManifest(),
    secret = 'test-secret-standalone / 47';
  let header: string | undefined;
  const f = await countingTarget((req, res) => {
    header = req.headers.authorization;
    res
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ reset: false, password: secret, echo: secret }));
  });
  try {
    const i = invocation(m, f.url);
    i.credentials = { service: secret };
    const before = structuredClone(m);
    const r = await runRegression(m, manifestHash(m), i);
    expect(header).toBe('Bearer ' + secret);
    expect(JSON.stringify(r)).not.toContain(secret);
    expect(JSON.stringify(r)).not.toContain(encodeURIComponent(secret));
    expect(m).toEqual(before);
  } finally {
    await f.close();
  }
});
test('known secret embedded in manifest/bundle is rejected rather than copied', async () => {
  const m = manifest(),
    vault = new SecretVault(),
    secret = 'test-export-secret-60';
  vault.register(secret);
  m.journey.rationale = secret;
  await expect(
    createRegressionBundle(m, manifestHash(m), vault),
  ).rejects.toThrow('EXPORT SECRET');
});
for (const verdict of ['NOT APPLICABLE', 'UNEVALUABLE'] as const)
  test(`${verdict} is inconclusive rather than a passing regression`, async () => {
    const m = manifest();
    if (verdict === 'NOT APPLICABLE')
      m.predicate.applicability.push({
        op: 'equals',
        left: { kind: 'literal', value: true },
        right: { kind: 'literal', value: false },
      });
    else
      m.predicate.assertions.push({
        op: 'equals',
        left: { kind: 'json', stepId: 'missing', pointer: '/state' },
        right: { kind: 'literal', value: 'CANCELLED' },
      });
    m.predicate.canonicalHash = predicateHash(m.predicate);
    m.predicateRef.hash = m.predicate.canonicalHash;
    m.journey.predicateRef.hash = m.predicate.canonicalHash;
    m.assertions = structuredClone(m.predicate.assertions);
    const f = await startOrderFixture(false);
    try {
      const r = await runRegression(m, manifestHash(m), invocation(m, f.url));
      expect(r).toMatchObject({ result: 'INCONCLUSIVE', verdict });
    } finally {
      await f.close();
    }
  });
test('fixed bundle bytes and joint identity are deterministic and dependency-isolated', async () => {
  const m = manifest(),
    before = canonical(m),
    a = await createRegressionBundle(m, manifestHash(m)),
    b = await createRegressionBundle(m, manifestHash(m));
  expect(a.code).toBe(b.code);
  expect(a.packageHash).toBe(b.packageHash);
  expect(a.runnerHash).toBe(createHash('sha256').update(a.code).digest('hex'));
  expect(a.packageHash).toBe(
    createHash('sha256')
      .update(
        canonical({
          formatVersion: 1,
          manifestHash: a.manifestHash,
          runnerHash: a.runnerHash,
        }),
      )
      .digest('hex'),
  );
  expect(a.fileName).toBe('regression.mjs');
  expect(a.inputs.join('\n')).not.toMatch(
    /server\/|planning\/|@google|node_modules\/pg\//,
  );
  expect(a.code).not.toContain(process.cwd());
  expect(a.code).not.toContain('DATABASE_URL');
  expect(a.code).not.toContain('GEMINI_API_KEY');
  expect(canonical(m)).toBe(before);
});
test('manifest mutation receives a new package identity', async () => {
  const m = manifest(),
    a = await createRegressionBundle(m, manifestHash(m));
  m.reset.version++;
  const b = await createRegressionBundle(m, manifestHash(m));
  expect(a.manifestHash).not.toBe(b.manifestHash);
  expect(a.packageHash).not.toBe(b.packageHash);
});
const child = promisify(execFile);
async function invokeFile(
  file: string,
  args: string[],
  env: Record<string, string | undefined> = {},
) {
  try {
    const r = await child(process.execPath, [file, ...args], {
      env: { ...env, NODE_ENV: 'test' },
      timeout: 15000,
    });
    return { stdout: r.stdout, stderr: r.stderr, code: 0 };
  } catch (error) {
    const e = error as { stdout: string; stderr: string; code: number };
    return { stdout: e.stdout, stderr: e.stderr, code: e.code };
  }
}
test('same offline mjs runs without node_modules/DB/Gemini: faulty FAIL, repaired PASS, no invocation refuses', async () => {
  const m = manifest(),
    b = await createRegressionBundle(m, manifestHash(m)),
    dir = await mkdtemp(join(tmpdir(), 'ghostqa-t043-'));
  try {
    const file = join(dir, b.fileName);
    await writeFile(file, b.code);
    const refused = await invokeFile(file, []);
    expect(refused).toMatchObject({
      code: 2,
      stdout: expect.stringContaining('INVALID CLI INVOCATION'),
    });
    expect(JSON.parse(refused.stdout).usedRequests).toBe(0);
    for (const repaired of [false, true]) {
      const f = await startOrderFixture(repaired);
      try {
        const r = await invokeFile(file, cliArgs(invocation(m, f.url)));
        expect(r.stderr).toBe('');
        expect(r.code).toBe(repaired ? 0 : 1);
        expect(JSON.parse(r.stdout)).toMatchObject({
          context: 'INDEPENDENT',
          result: repaired ? 'PASS' : 'FAIL',
          usedRequests: 5,
        });
      } finally {
        await f.close();
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
for (const flag of [
  '--target',
  '--address',
  '--approve-operation',
  '--ack-mutations',
  '--requests',
  '--milliseconds',
  '--request-timeout-ms',
])
  test(`CLI requires explicit ${flag} each invocation`, async () => {
    const m = manifest(),
      f = await countingTarget();
    try {
      const args = cliArgs(invocation(m, f.url));
      for (let n = args.length - 1; n >= 0; n--)
        if (args[n] === flag)
          args.splice(n, flag === '--ack-mutations' ? 1 : 2);
      const r = await regressionCli(
        args,
        { manifest: m, manifestHash: manifestHash(m) },
        {},
      );
      expect(r.exitCode).toBe(2);
      expect(f.count()).toBe(0);
    } finally {
      await f.close();
    }
  });
test('CLI environment/stdin inject credentials without argv values or result leakage', async () => {
  const m = credentialManifest(),
    f = await startOrderFixture(false),
    secret = 'protected-stdin-env-secret-13';
  try {
    const args = cliArgs(invocation(m, f.url)),
      env = await regressionCli(
        [...args, '--credential-env', 'service=TEST_SERVICE'],
        { manifest: m, manifestHash: manifestHash(m) },
        { TEST_SERVICE: secret },
      );
    expect(env.exitCode).toBe(1);
    async function* stdin() {
      yield JSON.stringify({ service: secret });
    }
    const supplied = await regressionCli(
      [...args, '--credentials-stdin'],
      { manifest: m, manifestHash: manifestHash(m) },
      {},
      stdin(),
    );
    expect(supplied.exitCode).toBe(1);
    expect(JSON.stringify([env, supplied])).not.toContain(secret);
  } finally {
    await f.close();
  }
});
test('CLI rejects raw credential flags and missing unbundled manifest authority', async () => {
  const r = await regressionCli(
    ['--credential', 'service=do-not-log-secret'],
    undefined,
    {},
  );
  expect(r.exitCode).toBe(2);
  expect(JSON.stringify(r)).not.toContain('do-not-log-secret');
});
test('standalone invocations cannot change real originating evidence, VERIFIED artifact, finding or counters', async () => {
  const h = await exportHarness(39);
  try {
    const generated = generateManifest(h.input);
    const verified = await verifyArtifact(h.s, h.run, generated);
    expect(verified.artifact.verification).toBe('VERIFIED');
    const before = await history(h),
      artifact = (await h.client.query('SELECT * FROM artifacts ORDER BY id'))
        .rows,
      finding = (await h.client.query('SELECT * FROM findings ORDER BY id'))
        .rows,
      budget = structuredClone(h.s.snapshot.budget),
      source = structuredClone(generated);
    for (const repaired of [false, true]) {
      const f = await startOrderFixture(repaired);
      try {
        const r = await runRegression(
          generated.manifest,
          generated.artifact.manifestHash,
          invocation(generated.manifest, f.url),
        );
        expect(r.result).toBe(repaired ? 'PASS' : 'FAIL');
      } finally {
        await f.close();
      }
    }
    expect(await history(h)).toEqual(before);
    expect(
      (await h.client.query('SELECT * FROM artifacts ORDER BY id')).rows,
    ).toEqual(artifact);
    expect(
      (await h.client.query('SELECT * FROM findings ORDER BY id')).rows,
    ).toEqual(finding);
    expect(h.s.snapshot.budget).toEqual(budget);
    expect(generated).toEqual(source);
  } finally {
    await h.close();
  }
});
test('unbundled CLI requires and validates the explicit manifest file/hash', async () => {
  const m = manifest(),
    f = await startOrderFixture(false),
    dir = await mkdtemp(join(tmpdir(), 'ghostqa-t043-cli-'));
  try {
    const file = join(dir, 'manifest.json');
    await writeFile(file, canonical(m));
    const args = cliArgs(invocation(m, f.url));
    const missing = await regressionCli(args, undefined, {});
    expect(missing.exitCode).toBe(2);
    const valid = await regressionCli(
      [...args, '--manifest', file, '--manifest-hash', manifestHash(m)],
      undefined,
      {},
    );
    expect(valid.exitCode).toBe(1);
    const tampered = await regressionCli(
      [...args, '--manifest', file, '--manifest-hash', '0'.repeat(64)],
      undefined,
      {},
    );
    expect(tampered.exitCode).toBe(2);
    expect(tampered.result.usedRequests).toBe(0);
  } finally {
    await f.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test('bundled API exposes only fixed-manifest execution, no arbitrary manifest or originating authority', async () => {
  const m = manifest(),
    b = await createRegressionBundle(m, manifestHash(m)),
    dir = await mkdtemp(join(tmpdir(), 'ghostqa-t043-api-'));
  try {
    const file = join(dir, b.fileName),
      check = join(dir, 'check.mjs');
    await writeFile(file, b.code);
    await writeFile(
      check,
      "import * as artifact from './regression.mjs'; console.log(JSON.stringify(Object.keys(artifact).sort()));",
    );
    const r = await invokeFile(check, []);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual(['manifestHash', 'runStandalone']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('tampered embedded manifest in fixed mjs fails integrity before any request', async () => {
  const m = manifest(),
    b = await createRegressionBundle(m, manifestHash(m)),
    dir = await mkdtemp(join(tmpdir(), 'ghostqa-t043-tamper-')),
    f = await countingTarget();
  try {
    const code = b.code.replace(
      'expectedStatuses:[409]',
      'expectedStatuses:[200]',
    );
    expect(code).not.toBe(b.code);
    const file = join(dir, b.fileName);
    await writeFile(file, code);
    const r = await invokeFile(file, cliArgs(invocation(m, f.url)));
    expect(r.code).toBe(2);
    expect(JSON.parse(r.stdout)).toMatchObject({
      result: 'ERROR',
      usedRequests: 0,
      reason: 'MANIFEST INTEGRITY ERROR',
    });
    expect(f.count()).toBe(0);
  } finally {
    await f.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test('protected environment credentials work in actual offline mjs without leaking into output or bytes', async () => {
  const m = credentialManifest(),
    b = await createRegressionBundle(m, manifestHash(m)),
    dir = await mkdtemp(join(tmpdir(), 'ghostqa-t043-auth-')),
    f = await startOrderFixture(false),
    secret = 'offline-runtime-credential / 71';
  try {
    const file = join(dir, b.fileName);
    await writeFile(file, b.code);
    const r = await invokeFile(
      file,
      [
        ...cliArgs(invocation(m, f.url)),
        '--credential-env',
        'service=TEST_SERVICE',
      ],
      { TEST_SERVICE: secret },
    );
    expect(r.code).toBe(1);
    expect(JSON.parse(r.stdout).result).toBe('FAIL');
    expect(r.stdout + r.stderr + b.code).not.toContain(secret);
    expect(r.stdout + r.stderr + b.code).not.toContain(
      encodeURIComponent(secret),
    );
  } finally {
    await f.close();
    await rm(dir, { recursive: true, force: true });
  }
});
for (const fault of [
  'unevaluable baseline',
  'execution authentication rejection',
  'redirect',
] as const)
  test(`${fault} stops honestly and does not follow or retry`, async () => {
    const m = manifest(),
      f = await countingTarget((req, res) => {
        const path = req.url ?? '';
        if (path.endsWith('/reset'))
          res
            .writeHead(200, { 'content-type': 'application/json' })
            .end('{"reset":true}');
        else if (path.endsWith('/baseline'))
          res
            .writeHead(200, { 'content-type': 'application/json' })
            .end(
              fault === 'unevaluable baseline' ? 'not-json' : '{"orders":0}',
            );
        else
          res
            .writeHead(fault === 'redirect' ? 302 : 401, {
              'content-type': 'application/json',
              location: '/outside',
            })
            .end('{"error":"refused"}');
      });
    try {
      const r = await runRegression(m, manifestHash(m), invocation(m, f.url));
      expect(r.result).toBe('ERROR');
      expect(r.usedRequests).toBe(fault === 'unevaluable baseline' ? 2 : 3);
      expect(f.count()).toBe(r.usedRequests);
      expect(r).not.toHaveProperty('verdict');
      if (fault !== 'unevaluable baseline')
        expect(r.baseline?.outcome).toBe('SATISFIED');
    } finally {
      await f.close();
    }
  });
