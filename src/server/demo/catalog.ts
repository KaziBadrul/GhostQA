// Submission-track fixture allowlist. The product surface may only start runs
// for these three local required fixtures; no arbitrary URL, OpenAPI document,
// or command is accepted from a request.
//
// Only the public, presentational fields are read here. Evaluator-private case
// data (hidden trigger sequences, variant labels, private minimization
// answers) is never loaded by this module; the engine path loads the
// authoritative evaluator entry separately.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { RequiredFixture } from '../../../fixtures/required';
import {
  DemoFixtureIdSchema,
  DemoFixtureSchema,
  type DemoFixture,
  type DemoFixtureId,
} from './contracts';

const SUITE_PATH = resolve('fixtures', 'private', 'required-suite.json');

interface Description {
  name: string;
  tagline: string;
  description: string;
}

const DESCRIPTIONS: Record<DemoFixtureId, Description> = {
  'order-lifecycle': {
    name: 'Order Lifecycle',
    tagline: 'Cancelled orders must not be fulfilled.',
    description:
      'A small orders API. GhostQA may create an order, read it, cancel it, or fulfil it. ' +
      'The interesting case is an unusual but individually valid order of those calls.',
  },
  inventory: {
    name: 'Inventory Allocation',
    tagline: 'Unavailable items must not be allocated.',
    description:
      'A stock API. GhostQA may create an item, read it, mark it unavailable, or allocate it. ' +
      'The interesting case is an unusual but individually valid order of those calls.',
  },
  workflow: {
    name: 'Document Workflow',
    tagline: 'Archived documents must not be published.',
    description:
      'A documents API. GhostQA may create a document, read it, archive it, or publish it. ' +
      'The interesting case is an unusual but individually valid order of those calls.',
  },
};

const PublicSuiteSchema = z.object({
  fixtures: z
    .array(
      z.object({
        id: DemoFixtureIdSchema,
        invariant: z.object({ sourceRef: z.string().min(1) }),
        operationPolicy: z.array(
          z.object({
            operationId: z.string().min(1),
            category: z.string(),
          }),
        ),
      }),
    )
    .length(3),
});

interface Catalog {
  fixtures: DemoFixture[];
  byId: Map<DemoFixtureId, DemoFixture>;
}

let cached: Promise<Catalog> | undefined;

async function load(): Promise<Catalog> {
  const suite = PublicSuiteSchema.parse(
    JSON.parse(await readFile(SUITE_PATH, 'utf8')),
  );
  const fixtures = suite.fixtures.map((entry) =>
    DemoFixtureSchema.parse({
      id: entry.id,
      name: DESCRIPTIONS[entry.id].name,
      tagline: DESCRIPTIONS[entry.id].tagline,
      description: DESCRIPTIONS[entry.id].description,
      invariant: entry.invariant.sourceRef,
      explorationOperations: entry.operationPolicy
        .filter((policy) => policy.category === 'EXPLORATION')
        .map((policy) => policy.operationId),
    }),
  );
  return {
    fixtures,
    byId: new Map(fixtures.map((fixture) => [fixture.id, fixture])),
  };
}

export async function demoFixtures(): Promise<DemoFixture[]> {
  cached ??= load();
  return (await cached).fixtures;
}

export async function demoFixture(id: DemoFixtureId): Promise<DemoFixture | undefined> {
  cached ??= load();
  return (await cached).byId.get(id);
}

// The evaluator entry is resolved by the engine path, which runs outside the
// application bundle. This only checks that the requested id is a known public
// fixture; it never returns evaluator-private data to the browser.
export function assertKnownFixture(id: DemoFixtureId): RequiredFixture['id'] {
  return id;
}