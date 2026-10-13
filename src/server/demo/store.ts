// Submission-track run records. The engine's own evidence stays in PostgreSQL;
// this store holds only presentation state and the generated report text so the
// dashboard survives navigation and dev-server reloads. It is never an
// authority for run status, dispatch, or findings.
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DemoRunRecordSchema, type DemoRunRecord } from './contracts';

const ROOT = resolve('.demo', 'runs');
const ID = /^[0-9a-f-]{36}$/;

async function ensureRoot() {
  await mkdir(ROOT, { recursive: true });
}

export async function newDemoRunId(): Promise<string> {
  return randomUUID();
}

export async function saveDemoRun(
  record: DemoRunRecord,
): Promise<DemoRunRecord> {
  const parsed = DemoRunRecordSchema.parse(record);
  await ensureRoot();
  const target = join(ROOT, `${parsed.id}.json`);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(parsed, null, 2), 'utf8');
  await rename(temporary, target);
  return parsed;
}

export async function loadDemoRun(
  id: string,
): Promise<DemoRunRecord | undefined> {
  if (!ID.test(id)) return undefined;
  try {
    return DemoRunRecordSchema.parse(
      JSON.parse(await readFile(join(ROOT, `${id}.json`), 'utf8')),
    );
  } catch {
    return undefined;
  }
}

export async function listDemoRuns(): Promise<DemoRunRecord[]> {
  await ensureRoot();
  const names = (await readdir(ROOT)).filter((name) => name.endsWith('.json'));
  const records: DemoRunRecord[] = [];
  for (const name of names) {
    try {
      records.push(
        DemoRunRecordSchema.parse(
          JSON.parse(await readFile(join(ROOT, name), 'utf8')),
        ),
      );
    } catch {
      // A partially written or unknown record is skipped, never guessed at.
    }
  }
  return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ---------------------------------------------------------------- reports ----

function reportDirectory(runId: string) {
  if (!ID.test(runId)) throw new Error('INVALID RUN ID');
  return join(ROOT, `${runId}.report`);
}

export async function writeDemoReport(
  runId: string,
  markdown: string,
  json: unknown,
): Promise<void> {
  await mkdir(reportDirectory(runId), { recursive: true });
  await writeFile(join(reportDirectory(runId), 'report.md'), markdown, 'utf8');
  await writeFile(
    join(reportDirectory(runId), 'report.json'),
    JSON.stringify(json, null, 2),
    'utf8',
  );
}

export async function readDemoReport(
  runId: string,
): Promise<{ markdown: string; json: unknown } | undefined> {
  if (!ID.test(runId)) return undefined;
  try {
    const directory = reportDirectory(runId);
    return {
      markdown: await readFile(join(directory, 'report.md'), 'utf8'),
      json: JSON.parse(await readFile(join(directory, 'report.json'), 'utf8')),
    };
  } catch {
    return undefined;
  }
}
export async function writeDemoBundle(runId: string, bundle: unknown) {
  await mkdir(reportDirectory(runId), { recursive: true });
  await writeFile(
    join(reportDirectory(runId), 'bundle.json'),
    JSON.stringify(bundle),
    'utf8',
  );
}
export async function readDemoBundle(runId: string): Promise<unknown> {
  try {
    return JSON.parse(
      await readFile(join(reportDirectory(runId), 'bundle.json'), 'utf8'),
    );
  } catch {
    return undefined;
  }
}
