import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { startFixture } from '../../fixtures/api/server';
import { accountOperationPolicy } from '../../fixtures/api/control';
import { isolatedDatabase } from '../helpers/database';
import { makeRun } from '../helpers/run';
import { migrate } from '../../src/server/migrate';
import { RunSupervisor } from '../../src/server/run-supervisor';
import { parseOpenApi } from '../../src/engine/openapi/parse';
import { approveScope } from '../../src/engine/policy/scope';
import { JourneySchema, PredicateSchema } from '../../src/engine/contracts';
import {
  predicateHash,
  evaluatePredicate,
} from '../../src/engine/detection/predicate';
import { establishFreshState } from '../../src/engine/fresh-state/manager';
import { executeJourney } from '../../src/engine/execution/journey';
import { summarize } from '../../src/engine/observations/summarize';

// Supplied evaluator journey proves safe execution only. It is NOT discovery evidence.
for (const repaired of [false, true])
  test(`supervised controlled fixture execution repaired=${repaired}`, async () => {
    const fixture = await startFixture(repaired);
    const db = await isolatedDatabase();
    let supervisor: RunSupervisor | undefined;
    try {
      await migrate(db.client, resolve('migrations'));
      const project = randomUUID();
      await db.client.query('INSERT INTO projects(id,name) VALUES($1,$2)', [
        project,
        'controlled-fixture',
      ]);
      const run = makeRun(project, fixture.port);
      run.apiSnapshot = await parseOpenApi(JSON.stringify(fixture.openapi));
      run.scope = approveScope(
        fixture.url + '/api',
        [{ ip: '127.0.0.1', family: 4 }],
        accountOperationPolicy(),
        true,
        randomUUID(),
      );
      const logic = {
        applicability: [],
        assertions: [
          {
            op: 'equals' as const,
            left: { kind: 'status' as const, stepId: 'use' },
            right: { kind: 'literal' as const, value: 403 },
          },
        ],
      };
      const predicate = PredicateSchema.parse({
        id: randomUUID(),
        version: 1,
        canonicalHash: predicateHash(logic),
        source: 'DEVELOPER',
        sourceRef: 'owner-approved-token-policy',
        ...logic,
      });
      run.predicates = [predicate];
      run.reset.resetSteps[0]!.operationId = 'POST /api/control/reset';
      run.reset.checkSteps[0]!.operationId = 'GET /api/control/baseline';
      const baselineLogic = {
        applicability: [],
        assertions: ['accounts', 'tokens'].map((name) => ({
          op: 'equals' as const,
          left: { kind: 'json' as const, stepId: 'read', pointer: '/' + name },
          right: { kind: 'literal' as const, value: 0 },
        })),
      };
      run.reset.baselineAssertions[0]!.predicate = PredicateSchema.parse({
        ...predicate,
        id: randomUUID(),
        sourceRef: 'owner-approved-empty-baseline',
        canonicalHash: predicateHash(baselineLogic),
        ...baselineLogic,
      });
      const journey = JourneySchema.parse({
        id: randomUUID(),
        predicateRef: {
          id: predicate.id,
          version: 1,
          hash: predicate.canonicalHash,
        },
        rationale: 'Evaluator-only executor acceptance',
        variables: [
          {
            name: 'email',
            expectedType: 'string',
            source: {
              kind: 'generate',
              generator: 'email',
              constraints: { type: 'string', format: 'email', maxLength: 256 },
            },
            sensitive: false,
          },
          {
            name: 'nextEmail',
            expectedType: 'string',
            source: {
              kind: 'generate',
              generator: 'email',
              constraints: { type: 'string', format: 'email', maxLength: 256 },
            },
            sensitive: false,
          },
          {
            name: 'password',
            expectedType: 'string',
            source: {
              kind: 'generate',
              generator: 'bounded-literal',
              constraints: { type: 'string', minLength: 12, maxLength: 12 },
            },
            sensitive: true,
          },
        ],
        dependencies: [
          { producer: 'create', consumer: 'issue', variable: 'id' },
          { producer: 'create', consumer: 'email', variable: 'id' },
          { producer: 'issue', consumer: 'use', variable: 'token' },
        ],
        steps: [
          {
            id: 'create',
            operationId: 'POST /api/accounts',
            parameters: [],
            body: { email: null, password: null },
            bodyBindings: [
              { pointer: '/email', value: { kind: 'variable', name: 'email' } },
              {
                pointer: '/password',
                value: { kind: 'variable', name: 'password' },
              },
            ],
            extracts: [
              {
                name: 'id',
                expectedType: 'string',
                source: { kind: 'json', stepId: 'create', pointer: '/id' },
                sensitive: false,
              },
            ],
            expectedStatuses: [201],
          },
          {
            id: 'issue',
            operationId: 'POST /api/accounts/{accountId}/password-reset',
            parameters: [
              {
                location: 'path',
                name: 'accountId',
                value: { kind: 'variable', name: 'id' },
              },
            ],
            bodyBindings: [],
            extracts: [
              {
                name: 'token',
                expectedType: 'string',
                source: { kind: 'json', stepId: 'issue', pointer: '/token' },
                sensitive: true,
              },
            ],
            expectedStatuses: [200],
          },
          {
            id: 'email',
            operationId: 'PATCH /api/accounts/{accountId}/email',
            parameters: [
              {
                location: 'path',
                name: 'accountId',
                value: { kind: 'variable', name: 'id' },
              },
            ],
            body: { email: null },
            bodyBindings: [
              {
                pointer: '/email',
                value: { kind: 'variable', name: 'nextEmail' },
              },
            ],
            extracts: [],
            expectedStatuses: [200],
          },
          {
            id: 'use',
            operationId: 'POST /api/password-reset',
            parameters: [],
            body: { token: null, password: null },
            bodyBindings: [
              { pointer: '/token', value: { kind: 'variable', name: 'token' } },
              {
                pointer: '/password',
                value: { kind: 'variable', name: 'password' },
              },
            ],
            extracts: [],
            expectedStatuses: [200, 403],
          },
        ],
      });
      supervisor = await RunSupervisor.acquire(db.client);
      await supervisor.accept(run);
      const first = await establishFreshState(
        supervisor,
        run,
        journey,
        'EXPLORATION',
        {},
      );
      await executeJourney(supervisor, run, journey, first);
      expect(evaluatePredicate(predicate, first.values)).toBe(
        repaired ? 'SATISFIED' : 'VIOLATED',
      );
      const id = first.values.vault.get('id'),
        token = first.values.vault.get('token');
      supervisor.finishTrial();
      const second = await establishFreshState(
        supervisor,
        run,
        journey,
        'REPLAY',
        {},
      );
      await executeJourney(supervisor, run, journey, second);
      expect(second.id).not.toBe(first.id);
      expect(second.baseline.id).not.toBe(first.baseline.id);
      expect(second.values.vault.get('id')).not.toBe(id);
      expect(second.values.vault.get('token')).not.toBe(token);
      expect(evaluatePredicate(predicate, second.values)).toBe(
        repaired ? 'SATISFIED' : 'VIOLATED',
      );
      const trace = await supervisor.repository.trace(project, run.id);
      expect(trace.observations).toHaveLength(12);
      expect(JSON.stringify(trace)).not.toContain(token);
      expect(JSON.stringify(trace)).not.toContain(
        second.values.vault.get('token'),
      );
      expect(JSON.stringify(trace)).not.toContain('xxxxxxxxxxxx');
      expect(
        JSON.stringify(summarize(trace.observations, second.values.vault)),
      ).not.toContain(token);
      expect(
        (await db.client.query('SELECT counters FROM runs')).rows[0].counters
          .requestsByPhase,
      ).toMatchObject({ RESET: 2, BASELINE: 2, EXPLORATION: 4, REPLAY: 4 });
    } finally {
      await supervisor?.shutdown();
      await db.close();
      await fixture.close();
    }
  });
