import { afterEach, expect, test, vi } from 'vitest';
import {
  planningFixture,
  providerBoundary,
  reply,
  type ProviderReply,
  type ReasoningProvider,
} from '../helpers/planning';

afterEach(() => vi.useRealTimers());

async function request(
  proposal: unknown,
  options: {
    timeoutMs?: number;
    remainingMilliseconds?: number;
    signal?: AbortSignal;
    result?: ProviderReply;
  } = {},
) {
  const fixture = planningFixture();
  if (proposal && typeof proposal === 'object' && 'predicateRef' in proposal) {
    fixture.context.approvedPredicateRefs = [
      proposal.predicateRef as import('../../src/engine/contracts').Json,
    ];
  }
  const provider = {
    propose: vi.fn<ReasoningProvider['propose']>(
      async () => options.result ?? reply(proposal),
    ),
  };
  const input = {
    provider,
    context: fixture.context,
    api: fixture.run.apiSnapshot,
    scope: fixture.run.scope,
    model: 'configured-model',
    signal: options.signal ?? new AbortController().signal,
    timeoutMs: options.timeoutMs ?? 30000,
    remainingMilliseconds: options.remainingMilliseconds ?? 600000,
  };
  const boundary = await providerBoundary();
  return { ...fixture, provider, input, boundary };
}

test('one provider-independent structured proposal; explicit model and usage retained', async () => {
  const fixture = planningFixture();
  const h = await request(fixture.journey);
  const result = await h.boundary.requestProposal(h.input);
  expect(result).toEqual(reply(fixture.journey));
  expect(h.provider.propose).toHaveBeenCalledTimes(1);
  expect(h.provider.propose.mock.calls[0]?.[0]).toEqual(h.context);
  expect(h.provider.propose.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
});

test.each([
  null,
  'not JSON',
  '```json\n{}\n```',
  { steps: [] },
  { tools: [{ name: 'execute' }] },
])(
  'malformed/refused/schema-invalid proposal stops MODEL PLAN ERROR without retry: %j',
  async (proposal) => {
    const h = await request(proposal);
    await expect(h.boundary.requestProposal(h.input)).rejects.toThrow(
      /^MODEL PLAN ERROR$/,
    );
    expect(h.provider.propose).toHaveBeenCalledTimes(1);
  },
);

test('output exceeding 64 KiB fails before accepting even a structurally valid journey', async () => {
  const fixture = planningFixture();
  const proposal = {
    ...fixture.journey,
    variables: Array.from({ length: 900 }, (_, i) => ({
      name: `value${i}`,
      expectedType: 'string',
      source: { kind: 'input', key: `input${i}` },
      sensitive: false,
    })),
  };
  expect(Buffer.byteLength(JSON.stringify(proposal))).toBeGreaterThan(
    64 * 1024,
  );
  const h = await request(proposal);
  await expect(h.boundary.requestProposal(h.input)).rejects.toThrow(
    /^MODEL PLAN ERROR$/,
  );
  expect(h.provider.propose).toHaveBeenCalledTimes(1);
});

test.each(['', 'another-model'])(
  'missing/mismatched configured model is rejected: %j',
  async (model) => {
    const h = await request(planningFixture().journey);
    h.input.model = model;
    await expect(h.boundary.requestProposal(h.input)).rejects.toThrow();
  },
);

test('pre-cancelled call invokes no provider', async () => {
  const controller = new AbortController();
  controller.abort();
  const h = await request(planningFixture().journey, {
    signal: controller.signal,
  });
  await expect(h.boundary.requestProposal(h.input)).rejects.toThrow(
    /^CANCELLED$/,
  );
  expect(h.provider.propose).not.toHaveBeenCalled();
});

test.each([
  ['configured', 20, 200, 20],
  ['shared deadline', 30000, 15, 15],
  ['hard cap', 60000, 90000, 30000],
] as const)(
  '%s deadline bounds a provider that ignores abort',
  async (_label, timeoutMs, remainingMilliseconds, elapsed) => {
    const h = await request(planningFixture().journey, {
      timeoutMs,
      remainingMilliseconds,
    });
    h.input.provider = {
      propose: vi.fn<ReasoningProvider['propose']>(
        () => new Promise<ProviderReply>(() => {}),
      ),
    };
    vi.useFakeTimers();
    const pending = h.boundary.requestProposal(h.input);
    const assertion = expect(pending).rejects.toThrow(/^MODEL ERROR$/);
    await vi.advanceTimersByTimeAsync(elapsed);
    await assertion;
    expect(h.input.provider.propose).toHaveBeenCalledTimes(1);
    const [, signal] = vi.mocked(h.input.provider.propose).mock.calls[0]!;
    expect(signal.aborted).toBe(true);
  },
);

test('in-flight cancellation aborts provider and rejects a late success', async () => {
  const controller = new AbortController();
  const h = await request(planningFixture().journey, {
    signal: controller.signal,
  });
  let resolve!: (result: ProviderReply) => void;
  h.input.provider = {
    propose: vi.fn<ReasoningProvider['propose']>(
      () =>
        new Promise<ProviderReply>((r) => {
          resolve = r;
        }),
    ),
  };
  const pending = h.boundary.requestProposal(h.input);
  const assertion = expect(pending).rejects.toThrow(/^CANCELLED$/);
  await Promise.resolve();
  controller.abort();
  resolve(reply(h.journey));
  await assertion;
  expect(h.input.provider.propose).toHaveBeenCalledTimes(1);
});

test.each([
  new Error('unavailable planted-provider-secret'),
  Object.assign(new Error('429 planted-provider-secret'), { status: 429 }),
])(
  'provider outage/rate limit stops MODEL ERROR once and hides exception payload',
  async (error) => {
    const h = await request(planningFixture().journey);
    h.input.provider = {
      propose: vi.fn<ReasoningProvider['propose']>(async () => {
        throw error;
      }),
    };
    await expect(h.boundary.requestProposal(h.input)).rejects.toThrow(
      /^MODEL ERROR$/,
    );
    expect(h.input.provider.propose).toHaveBeenCalledTimes(1);
  },
);

test('fallback tokens use ceiling UTF-8 bytes/4, not characters or zero', async () => {
  const journey = planningFixture().journey;
  const h = await request(journey);
  h.input.context.symbolicInputs = { label: '東京' };
  h.input.provider = {
    propose: vi.fn<ReasoningProvider['propose']>(async () => ({
      ...reply(journey),
      usage: { estimated: true },
    })),
  };
  const result = await h.boundary.requestProposal(h.input);
  expect(result.usage).toEqual({
    inputTokens: Math.ceil(
      Buffer.byteLength(JSON.stringify(h.input.context)) / 4,
    ),
    outputTokens: Math.ceil(Buffer.byteLength(JSON.stringify(journey)) / 4),
    estimated: true,
  });
});

test.each([
  'operation',
  'parameter',
  'binding',
  'reset',
  'baseline',
  'excluded',
  'phase',
])('provider proposal undergoes deterministic %s rejection', async (kind) => {
  const fixture = planningFixture();
  const h = await request(fixture.journey);
  const proposal = structuredClone(fixture.journey);
  const step = proposal.steps[0]!;
  if (kind === 'operation') step.operationId = 'POST /invented';
  if (kind === 'reset') step.operationId = 'POST /api/reset';
  if (kind === 'baseline') step.operationId = 'GET /api/baseline';
  if (kind === 'parameter')
    step.parameters.push({
      location: 'query',
      name: 'invented',
      value: { kind: 'literal', value: 1 },
    });
  if (kind === 'binding')
    step.bodyBindings.push({
      pointer: '/missing',
      value: { kind: 'variable', name: 'invented' },
    });
  if (kind === 'excluded') {
    const permission = h.input.scope.operationPolicy.find(
      (p) => p.operationId === step.operationId,
    )!;
    permission.category = 'EXCLUDED';
    permission.phases = [];
  }
  h.input.provider = {
    propose: vi.fn<ReasoningProvider['propose']>(async () =>
      reply(kind === 'phase' ? { ...proposal, phase: 'RESET' } : proposal),
    ),
  };
  await expect(h.boundary.requestProposal(h.input)).rejects.toThrow(
    /^MODEL PLAN ERROR$/,
  );
  expect(h.input.provider.propose).toHaveBeenCalledTimes(1);
});

test('oversized context rejects locally without making a model call', async () => {
  const h = await request(planningFixture().journey);
  h.input.context.symbolicInputs = { huge: 'x'.repeat(128 * 1024) };
  await expect(h.boundary.requestProposal(h.input)).rejects.toThrow();
  expect(h.provider.propose).not.toHaveBeenCalled();
});

test.each(['id', 'version', 'hash'] as const)(
  'different predicate %s is MODEL PLAN ERROR',
  async (field) => {
    const journey = planningFixture().journey;
    const h = await request(journey);
    const changed = structuredClone(journey);
    if (field === 'id')
      changed.predicateRef.id = '00000000-0000-4000-8000-000000000001';
    if (field === 'version') changed.predicateRef.version++;
    if (field === 'hash') changed.predicateRef.hash = 'f'.repeat(64);
    h.input.provider = {
      propose: vi.fn<ReasoningProvider['propose']>(async () => reply(changed)),
    };
    await expect(h.boundary.requestProposal(h.input)).rejects.toThrow(
      /^MODEL PLAN ERROR$/,
    );
    expect(h.input.provider.propose).toHaveBeenCalledTimes(1);
  },
);
