// Read-only access to historical Gate 5 acceptance evidence produced by real
// configured-Gemini runs. Nothing here executes anything; it replays committed
// files from the repository. Recorded evidence is always labelled as recorded.
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  DemoFixtureIdSchema,
  RecordedRunIdSchema,
  RecordedRunSummarySchema,
  type DemoFixtureId,
  type RecordedRunSummary,
} from './contracts';

const ACCEPTANCE = resolve('tests', 'acceptance');

const TokenSchema = z.record(z.string(), z.unknown());
export type Token = z.infer<typeof TokenSchema>;

const ResultSchema = z.object({
  assignment: z.object({
    fixtureId: DemoFixtureIdSchema,
    mode: z.string(),
    variant: z.enum(['faulty', 'repaired']),
    runId: z.string(),
  }),
  stopReason: z.string(),
  discoveryStatus: z.string().optional(),
  confirmationStatus: z.string().optional(),
  artifactStatus: z.string().optional(),
  metrics: z.object({
    requests: z.number(),
    modelCalls: z.number(),
    originalLength: z.number().nullish(),
    bestLength: z.number().nullish(),
  }),
});
export type RecordedResult = z.infer<typeof ResultSchema>;

const SERIES = /^gate5-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let cached: Promise<RecordedRunSummary[]> | undefined;

async function scan(): Promise<RecordedRunSummary[]> {
  let directories: string[];
  try {
    directories = (await readdir(ACCEPTANCE, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && SERIES.test(entry.name))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
  const summaries: RecordedRunSummary[] = [];
  for (const seriesId of directories.sort()) {
    const entries = (await readdir(resolve(ACCEPTANCE, seriesId))).filter(
      (name) => /^[0-9]{1,3}-result\.json$/.test(name),
    );
    for (const name of entries) {
      try {
        const raw = JSON.parse(
          await readFile(resolve(ACCEPTANCE, seriesId, name), 'utf8'),
        );
        const result = ResultSchema.parse(raw);
        if (result.assignment.mode !== 'AUTONOMOUS_DISCOVERY') continue;
        summaries.push(
          RecordedRunSummarySchema.parse({
            id: `${seriesId}/${Number(name.split('-')[0])}`,
            seriesId,
            fixtureId: result.assignment.fixtureId,
            variant: result.assignment.variant,
            discoveryStatus: result.discoveryStatus ?? 'NOT RECORDED',
            confirmationStatus: result.confirmationStatus ?? 'NOT RECORDED',
            artifactStatus: result.artifactStatus ?? 'NOT GENERATED',
            stopReason: result.stopReason,
            requests: result.metrics.requests,
            modelCalls: result.metrics.modelCalls,
            originalLength: result.metrics.originalLength ?? null,
            minimizedLength: result.metrics.bestLength ?? null,
            runId: result.assignment.runId,
          }),
        );
      } catch {
        // Unknown or foreign result files are ignored, never partially parsed.
      }
    }
  }
  return summaries;
}

export async function recordedRuns(): Promise<RecordedRunSummary[]> {
  cached ??= scan();
  const all = await cached;
  // Violations first, then repaired variants, then failures: the useful demo
  // ordering, over exactly the evidence that exists.
  const rank = (summary: RecordedRunSummary) =>
    summary.discoveryStatus === 'OBSERVED VIOLATION'
      ? 0
      : summary.variant === 'repaired'
        ? 2
        : 1;
  return [...all].sort(
    (a, b) => rank(a) - rank(b) || a.fixtureId.localeCompare(b.fixtureId),
  );
}

export async function recordedRun(id: string): Promise<RecordedRunSummary | undefined> {
  const parsed = RecordedRunIdSchema.safeParse(id);
  if (!parsed.success) return undefined;
  return (await recordedRuns()).find((summary) => summary.id === parsed.data);
}

// Paths are rebuilt from the validated id only; caller input never reaches the
// filesystem layer.
export async function readRecordedReport(id: string): Promise<
  { markdown: string; json: Token } | undefined
> {
  const parsed = RecordedRunIdSchema.safeParse(id);
  if (!parsed.success) return undefined;
  const directory = resolve(ACCEPTANCE, parsed.data);
  try {
    return {
      markdown: await readFile(resolve(directory, 'report.md'), 'utf8'),
      json: TokenSchema.parse(
        JSON.parse(await readFile(resolve(directory, 'report.json'), 'utf8')),
      ),
    };
  } catch {
    return undefined;
  }
}

export function recordedFixtureSummary(
  summaries: RecordedRunSummary[],
  fixtureId: DemoFixtureId,
) {
  return summaries.filter((summary) => summary.fixtureId === fixtureId);
}