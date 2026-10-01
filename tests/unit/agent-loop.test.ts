import { randomUUID } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { freshHarness } from '../helpers/fresh';
import { makeJourney } from '../helpers/journey';
import { reply } from '../helpers/planning';
import { explore } from '../../src/engine/session/explore';
import { hypothesisHash, unpackProposal } from '../../src/engine/mapping/state';
import { predicateHash } from '../../src/engine/detection/predicate';
import type { Journey, Run } from '../../src/engine/contracts';
import type { ReasoningProvider } from '../../src/engine/planning/provider';
function journey(run: Run, operation = 'GET /api/item'): Journey {
  const j = makeJourney(operation);
  j.predicateRef = {
    id: run.predicates[0]!.id,
    version: run.predicates[0]!.version,
    hash: run.predicates[0]!.canonicalHash,
  };
  return j;
}
function addOperation(run: Run) {
  run.apiSnapshot.operations.push({
    ...run.apiSnapshot.operations[2]!,
    id: 'HEAD /api/item',
    method: 'HEAD',
  });
  run.scope.operationIds.push('HEAD /api/item');
  run.scope.operationPolicy.push({
    operationId: 'HEAD /api/item',
    category: 'EXPLORATION',
    phases: ['EXPLORATION'],
  });
}

test('adaptive planning receives sanitized observations; every new journey obtains a new baseline', async () => {
  const h = await freshHarness(200, 200, {
    credential: 'configured-private-value',
    itemBody: {
      token: 'issued-private-value',
      password: 'response-private-value',
    },
    configure: (run) => {
      addOperation(run);
      run.budget.limits.journeys = 2;
    },
  });
  const contexts: unknown[] = [];
  const provider: ReasoningProvider = {
    propose: vi.fn(async (context) => {
      contexts.push(context);
      return reply(
        journey(
          h.run,
          contexts.length === 1 ? 'GET /api/item' : 'HEAD /api/item',
        ),
      );
    }),
  };
  try {
    const result = await explore(h.s, provider, {
      password: 'configured-input-private-value',
    });
    expect(result.stopReason).toBe('JOURNEY LIMIT');
    expect(result.trials).toHaveLength(2);
    expect(new Set(result.trials.map((e) => e.baselineEvidenceId)).size).toBe(
      2,
    );
    expect(contexts[1]).toMatchObject({
      observations: [expect.objectContaining({ stepId: 'inspect' })],
    });
    const persisted = JSON.stringify(
      await h.s.repository.trace(h.run.projectId, h.run.id),
    );
    const captured = JSON.stringify(contexts);
    for (const secret of [
      'configured-private-value',
      'issued-private-value',
      'response-private-value',
      'configured-input-private-value',
    ]) {
      expect(captured).not.toContain(secret);
      expect(persisted).not.toContain(secret);
    }
    expect(captured).toContain('[SECRET_');
    expect(h.calls).toEqual([
      '/api/reset',
      '/api/baseline',
      '/api/item',
      '/api/reset',
      '/api/baseline',
      '/api/item',
    ]);
    const counters = (await h.client.query('SELECT counters FROM runs')).rows[0]
      .counters;
    expect(counters).toMatchObject({
      modelCalls: 2,
      usedRequests: 6,
      usedExplorationJourneys: 2,
      stagnantRounds: 0,
    });
    expect(
      result.trials.every(
        (e) => e.predicateRef.hash === h.run.predicates[0]!.canonicalHash,
      ),
    ).toBe(true);
  } finally {
    await h.close();
  }
});

test('one useful journey then three cosmetic duplicate rounds stops STAGNATION without duplicate execution', async () => {
  const h = await freshHarness();
  const provider: ReasoningProvider = {
    propose: vi.fn(async () => ({
      ...reply({
        ...journey(h.run),
        id: randomUUID(),
        rationale: String(Math.random()),
      }),
    })),
  };
  try {
    const result = await explore(h.s, provider);
    expect(result.stopReason).toBe('STAGNATION');
    expect(result.trials).toHaveLength(1);
    expect(provider.propose).toHaveBeenCalledTimes(4);
    expect(h.calls).toHaveLength(3);
    expect(
      (await h.client.query('SELECT counters FROM runs')).rows[0].counters,
    ).toMatchObject({ modelCalls: 4, stagnantRounds: 3, usedRequests: 3 });
  } finally {
    await h.close();
  }
});

test.each([
  'operation',
  'destination',
  'reset',
  'phase',
  'predicate',
  'binding',
  'steps',
  'malformed',
])('invalid %s stops MODEL PLAN ERROR before reset', async (kind) => {
  const h = await freshHarness();
  const j = journey(h.run);
  if (kind === 'operation') j.steps[0]!.operationId = 'POST /hallucinated';
  if (kind === 'destination') j.steps[0]!.operationId = 'https://other.invalid';
  if (kind === 'reset') j.steps[0]!.operationId = 'POST /api/reset';
  if (kind === 'predicate') j.predicateRef.version++;
  if (kind === 'binding')
    j.steps[0]!.bodyBindings.push({
      pointer: '/missing',
      value: { kind: 'variable', name: 'missing' },
    });
  if (kind === 'steps')
    j.steps = Array.from({ length: 11 }, (_, i) => ({
      ...j.steps[0]!,
      id: `step${i}`,
    }));
  const provider: ReasoningProvider = {
    propose: vi.fn(async () =>
      reply(
        kind === 'phase'
          ? { ...j, phase: 'RESET' }
          : kind === 'malformed'
            ? null
            : j,
      ),
    ),
  };
  try {
    expect((await explore(h.s, provider)).stopReason).toBe('MODEL PLAN ERROR');
    expect(provider.propose).toHaveBeenCalledTimes(1);
    expect(h.calls).toHaveLength(0);
    expect(
      (await h.client.query('SELECT counters FROM runs')).rows[0].counters
        .modelCalls,
    ).toBe(1);
  } finally {
    await h.close();
  }
});

test('unresolved configured input stops safely without guessing or reset dispatch', async () => {
  const h = await freshHarness();
  const j = journey(h.run);
  j.variables.push({
    name: 'missing',
    expectedType: 'string',
    sensitive: false,
    source: { kind: 'input', key: 'undefined-input' },
  });
  try {
    expect(
      (await explore(h.s, { propose: async () => reply(j) })).stopReason,
    ).toBe('EXECUTION ERROR');
    expect(h.calls).toHaveLength(0);
  } finally {
    await h.close();
  }
});

test.each(['MODEL ERROR', 'CANCELLED'])(
  'provider failure/cancellation stops %s with one call and unknown output usage',
  async (reason) => {
    const h = await freshHarness();
    const provider: ReasoningProvider = {
      identity: { provider: 'mock-provider', model: 'configured-model' },
      propose: vi.fn(async () => {
        if (reason === 'CANCELLED') h.s.cancel();
        throw new Error('raw-provider-secret');
      }),
    };
    try {
      expect((await explore(h.s, provider)).stopReason).toBe(reason);
      expect(h.calls).toHaveLength(0);
      expect(provider.propose).toHaveBeenCalledTimes(1);
      const trace = await h.s.repository.trace(h.run.projectId, h.run.id);
      expect(JSON.stringify(trace)).not.toContain('raw-provider-secret');
      expect(trace.evidence).toContainEqual(
        expect.objectContaining({
          telemetry: expect.objectContaining({
            attempted: true,
            usage: expect.not.objectContaining({ outputTokens: 0 }),
          }),
        }),
      );
    } finally {
      await h.close();
    }
  },
);

test.each(['requests', 'journeys', 'cancelled'])(
  'preflight %s exhaustion prevents provider and target calls',
  async (kind) => {
    const h = await freshHarness(200, kind === 'requests' ? 2 : 200, {
      configure: (run) => {
        if (kind === 'journeys') run.budget.limits.journeys = 1;
      },
    });
    const provider: ReasoningProvider = {
      propose: vi.fn(async () => reply(journey(h.run))),
    };
    try {
      if (kind === 'cancelled') h.s.cancel();
      const result = await explore(h.s, provider);
      expect(result.stopReason).toBe(
        kind === 'requests'
          ? 'BUDGET EXHAUSTED'
          : kind === 'journeys'
            ? 'JOURNEY LIMIT'
            : 'CANCELLED',
      );
      expect(provider.propose).toHaveBeenCalledTimes(
        kind === 'journeys' ? 1 : 0,
      );
      expect(h.calls).toHaveLength(kind === 'journeys' ? 3 : 0);
    } finally {
      await h.close();
    }
  },
);

test('combined mapping/hypothesis proposals retain provenance and never grant approval', async () => {
  const h = await freshHarness(200, 200, {
    configure: (run) => {
      run.budget.limits.journeys = 1;
    },
  });
  const hypothesis = {
    ...structuredClone(h.run.predicates[0]!),
    id: randomUUID(),
    source: 'AGENT_HYPOTHESIS' as const,
    sourceRef: 'model hypothesis',
  };
  hypothesis.canonicalHash = predicateHash(hypothesis);
  const mapping = {
    id: randomUUID(),
    kind: 'HYPOTHESIZED_STATE',
    statement: 'The operation may change state',
    rationale: 'Proposal only',
    operationIds: ['GET /api/item'],
    evidenceIds: [],
  };
  try {
    const result = await explore(h.s, {
      propose: async () =>
        reply({
          journey: journey(h.run),
          mappings: [mapping],
          hypotheses: [hypothesis],
        }),
    });
    expect(result.stopReason).toBe('JOURNEY LIMIT');
    const trace = await h.s.repository.trace(h.run.projectId, h.run.id);
    expect(JSON.stringify(trace.evidence)).toContain('AGENT_HYPOTHESIS');
    expect(
      (await h.client.query('SELECT count(*)::int AS n FROM findings')).rows[0]
        .n,
    ).toBe(0);
    expect(
      (await h.client.query('SELECT count(*)::int AS n FROM approvals')).rows[0]
        .n,
    ).toBe(0);
    expect(() =>
      unpackProposal({
        journey: journey(h.run),
        mappings: [{ ...mapping, kind: 'DECLARED' }],
        hypotheses: [],
      }),
    ).toThrow();
    expect(() =>
      unpackProposal({
        journey: journey(h.run),
        mappings: [],
        hypotheses: [{ ...hypothesis, approvalRef: randomUUID() }],
      }),
    ).toThrow();
  } finally {
    await h.close();
  }
});

test('novelty ignores IDs, rationale, fresh literal values and names but keeps operation order and predicate version', () => {
  const j = makeJourney();
  j.steps[0]!.parameters = [
    {
      location: 'query',
      name: 'id',
      value: { kind: 'literal', value: 'fresh-one' },
    },
  ];
  const changed = structuredClone(j);
  changed.id = randomUUID();
  changed.rationale = 'cosmetic';
  changed.steps[0]!.id = 'renamed';
  changed.steps[0]!.parameters[0]!.value = {
    kind: 'literal',
    value: 'fresh-two',
  };
  expect(hypothesisHash(changed)).toBe(hypothesisHash(j));
  changed.predicateRef.version++;
  expect(hypothesisHash(changed)).not.toBe(hypothesisHash(j));
});

test('all four provenance kinds remain distinguishable in adaptive context', async () => {
  const h = await freshHarness();
  let call = 0;
  const contexts: unknown[] = [];
  const mapping = {
    id: randomUUID(),
    kind: 'HYPOTHESIZED_STATE',
    statement: 'May have state',
    rationale: 'Unapproved reasoning',
    operationIds: ['GET /api/item'],
    evidenceIds: [],
  };
  try {
    const provider: ReasoningProvider = {
      propose: async (context) => {
        contexts.push(context);
        call++;
        if (call === 1) {
          const j = journey(h.run);
          j.steps[0]!.extracts.push({
            name: 'status',
            expectedType: 'integer',
            sensitive: false,
            source: { kind: 'status', stepId: 'inspect' },
          });
          j.steps.push({ ...j.steps[0]!, id: 'again', extracts: [] });
          j.dependencies.push({
            producer: 'inspect',
            consumer: 'again',
            variable: 'status',
          });
          return reply({ journey: j, mappings: [mapping], hypotheses: [] });
        }
        throw new Error('stop mocked provider');
      },
    };
    const result = await explore(h.s, provider);
    expect(result.stopReason).toBe('MODEL ERROR');
    const second = contexts[1] as {
      mappings: { kind: string; evidenceIds: string[] }[];
    };
    expect(new Set(second.mappings.map((m) => m.kind))).toEqual(
      new Set([
        'DECLARED',
        'INFERRED_DEPENDENCY',
        'HYPOTHESIZED_STATE',
        'OBSERVED_TRANSITION',
      ]),
    );
    expect(
      second.mappings
        .filter((m) => m.kind === 'OBSERVED_TRANSITION')
        .every((m) => m.evidenceIds.length > 0),
    ).toBe(true);
  } finally {
    await h.close();
  }
});

test('short-by-one full trial budget prevents reset after a valid proposal', async () => {
  const h = await freshHarness(200, 3);
  const j = journey(h.run);
  j.steps.push({ ...j.steps[0]!, id: 'again' });
  try {
    expect(
      (await explore(h.s, { propose: async () => reply(j) })).stopReason,
    ).toBe('BUDGET EXHAUSTED');
    expect(h.calls).toHaveLength(0);
    expect(
      (await h.client.query('SELECT counters FROM runs')).rows[0].counters
        .usedRequests,
    ).toBe(0);
  } finally {
    await h.close();
  }
});

test('model timeout stops with unknown output and no target dispatch', async () => {
  const h = await freshHarness(200, 200, {
    configure: (run) => {
      run.budget.limits.modelTimeoutMs = 20;
    },
  });
  try {
    expect(
      (await explore(h.s, { propose: () => new Promise(() => {}) })).stopReason,
    ).toBe('MODEL ERROR');
    expect(h.calls).toHaveLength(0);
  } finally {
    await h.close();
  }
});

test('planning intent persistence failure prevents model and target dispatch', async () => {
  const h = await freshHarness();
  const provider: ReasoningProvider = {
    propose: vi.fn(async () => reply(journey(h.run))),
  };
  h.s.repository.planning = async () => {
    throw new Error('private-storage-message');
  };
  try {
    expect((await explore(h.s, provider)).stopReason).toBe('STORAGE ERROR');
    expect(provider.propose).not.toHaveBeenCalled();
    expect(h.calls).toHaveLength(0);
  } finally {
    await h.close();
  }
});

test('cancellation after planning intent persistence prevents model dispatch', async () => {
  const h = await freshHarness();
  const provider: ReasoningProvider = {
    propose: vi.fn(async () => reply(journey(h.run))),
  };
  const original = h.s.repository.planning.bind(h.s.repository);
  h.s.repository.planning = async (...args) => {
    await original(...args);
    h.s.cancel();
  };
  try {
    expect((await explore(h.s, provider)).stopReason).toBe('CANCELLED');
    expect(provider.propose).not.toHaveBeenCalled();
    expect(h.calls).toHaveLength(0);
  } finally {
    await h.close();
  }
});

test.each(['DECLARED', 'OBSERVED_TRANSITION', 'approval'])(
  'model cannot promote %s provenance or approval',
  async (kind) => {
    const h = await freshHarness();
    const p = {
      ...structuredClone(h.run.predicates[0]!),
      id: randomUUID(),
      source: 'AGENT_HYPOTHESIS',
      sourceRef: 'model',
      approvalRef: randomUUID(),
    };
    const mapping = {
      id: randomUUID(),
      kind,
      statement: 'claim',
      rationale: 'claim',
      operationIds: ['GET /api/item'],
      evidenceIds: [randomUUID()],
    };
    try {
      const result = await explore(h.s, {
        propose: async () =>
          reply({
            journey: journey(h.run),
            mappings: kind === 'approval' ? [] : [mapping],
            hypotheses: kind === 'approval' ? [p] : [],
          }),
      });
      expect(result.stopReason).toBe('MODEL PLAN ERROR');
      expect(h.calls).toHaveLength(0);
    } finally {
      await h.close();
    }
  },
);

test('raw configured secret in untrusted rationale is redacted before planning and journey persistence', async () => {
  const secret = 'private-planner-rationale-secret';
  const h = await freshHarness(200, 200, {
    credential: secret,
    configure: (run) => {
      run.budget.limits.journeys = 1;
    },
  });
  const j = journey(h.run);
  j.rationale = `Unexpected model echo ${secret}`;
  try {
    expect(
      (await explore(h.s, { propose: async () => reply(j) })).stopReason,
    ).toBe('JOURNEY LIMIT');
    expect(
      JSON.stringify(await h.s.repository.trace(h.run.projectId, h.run.id)),
    ).not.toContain(secret);
  } finally {
    await h.close();
  }
});

test('renewed configured/generated names do not change novelty; extraction/binding structure does', () => {
  const j = makeJourney();
  j.variables = [
    {
      name: 'first',
      expectedType: 'string',
      source: {
        kind: 'generate',
        generator: 'uuid',
        constraints: { type: 'string', format: 'uuid' },
      },
      sensitive: false,
    },
  ];
  j.steps[0]!.parameters = [
    {
      location: 'query',
      name: 'id',
      value: { kind: 'variable', name: 'first' },
    },
  ];
  const changed = structuredClone(j);
  changed.variables[0]!.name = 'second';
  changed.steps[0]!.parameters[0]!.value = { kind: 'variable', name: 'second' };
  expect(hypothesisHash(changed)).toBe(hypothesisHash(j));
  changed.variables[0]!.source = { kind: 'input', key: 'configured-id' };
  expect(hypothesisHash(changed)).not.toBe(hypothesisHash(j));
  changed.steps[0]!.parameters[0]!.name = 'different-field';
  expect(hypothesisHash(changed)).not.toBe(hypothesisHash(j));
});

test('redaction cannot silently change a proposed predicate semantic hash', async () => {
  const secret = 'private-hypothesis-literal-secret';
  const h = await freshHarness(200, 200, { credential: secret });
  const hypothesis = {
    ...structuredClone(h.run.predicates[0]!),
    id: randomUUID(),
    source: 'AGENT_HYPOTHESIS' as const,
    sourceRef: 'model hypothesis',
    assertions: [
      {
        op: 'equals' as const,
        left: { kind: 'literal' as const, value: secret },
        right: { kind: 'literal' as const, value: 'expected' },
      },
    ],
  };
  hypothesis.canonicalHash = predicateHash(hypothesis);
  try {
    const result = await explore(h.s, {
      propose: async () =>
        reply({
          journey: journey(h.run),
          mappings: [],
          hypotheses: [hypothesis],
        }),
    });
    expect(result.stopReason).toBe('MODEL PLAN ERROR');
    expect(h.calls).toHaveLength(0);
    expect(
      JSON.stringify(await h.s.repository.trace(h.run.projectId, h.run.id)),
    ).not.toContain(secret);
  } finally {
    await h.close();
  }
});
