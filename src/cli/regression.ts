import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isIP } from 'node:net';
import { runRegression, type Invocation } from '../engine/exports/runner';

declare const GHOSTQA_BUNDLE: boolean;
export const regressionUsage =
  'Require --target URL --address IP (repeatable) --approve-operation "METHOD /path" (repeatable), --requests N --milliseconds N --request-timeout-ms N; --ack-mutations for mutations. Unbundled CLI also requires --manifest FILE --manifest-hash SHA256. Credentials: --credential-env SLOT=ENV_NAME or --credentials-stdin (JSON slot/value object). Inputs: --input-env KEY=ENV_NAME (JSON values).';
export async function regressionCli(
  args: string[],
  embedded?: { manifest: unknown; manifestHash: string },
  environment: Readonly<Record<string, string | undefined>> = process.env,
  stdin: AsyncIterable<string | Buffer> = process.stdin,
) {
  const abort = new AbortController();
  const cancel = () => abort.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const single = new Map<string, string>(),
      multiple = new Map<string, string[]>();
    let mutationsAcknowledged = false,
      credentialsStdin = false;
    const flags = new Set([
      '--manifest',
      '--manifest-hash',
      '--target',
      '--requests',
      '--milliseconds',
      '--request-timeout-ms',
    ]);
    const repeated = new Set([
      '--address',
      '--approve-operation',
      '--credential-env',
      '--input-env',
    ]);
    for (let n = 0; n < args.length; n++) {
      const flag = args[n]!;
      if (flag === '--ack-mutations') {
        if (mutationsAcknowledged) throw new Error();
        mutationsAcknowledged = true;
        continue;
      }
      if (flag === '--credentials-stdin') {
        if (credentialsStdin) throw new Error();
        credentialsStdin = true;
        continue;
      }
      if (!flags.has(flag) && !repeated.has(flag)) throw new Error();
      const value = args[++n];
      if (!value || value.startsWith('--')) throw new Error();
      if (repeated.has(flag))
        multiple.set(flag, [...(multiple.get(flag) ?? []), value]);
      else {
        if (single.has(flag)) throw new Error();
        single.set(flag, value);
      }
    }
    const required = (key: string) => {
      const v = single.get(key);
      if (!v) throw new Error();
      return v;
    };
    const integer = (key: string) => {
      const v = required(key);
      if (!/^[1-9][0-9]*$/.test(v)) throw new Error();
      return Number(v);
    };
    // No implicit target/budget/operation consent, even for an embedded manifest.
    const target = required('--target'),
      requests = integer('--requests'),
      milliseconds = integer('--milliseconds'),
      requestTimeoutMs = integer('--request-timeout-ms');
    const addresses = (multiple.get('--address') ?? []).map((ip) => {
      const family = isIP(ip);
      if (family !== 4 && family !== 6) throw new Error();
      return { ip, family };
    });
    const approvedOperations = multiple.get('--approve-operation') ?? [];
    const credentials: Record<string, string> = Object.create(null),
      inputs: Invocation['inputs'] = Object.create(null);
    const mappings = (
      flag: string,
      consume: (slot: string, value: string) => void,
    ) => {
      const seen = new Set<string>();
      for (const pair of multiple.get(flag) ?? []) {
        const match = /^([^=]+)=([A-Za-z_][A-Za-z0-9_]*)$/.exec(pair);
        if (!match || seen.has(match[1]!)) throw new Error();
        seen.add(match[1]!);
        const value = environment[match[2]!];
        if (value === undefined) throw new Error();
        consume(match[1]!, value);
      }
    };
    if (credentialsStdin) {
      if (multiple.has('--credential-env')) throw new Error();
      let content = '';
      for await (const chunk of stdin) {
        content += chunk.toString();
        if (Buffer.byteLength(content) > 65536) throw new Error();
      }
      const raw: unknown = JSON.parse(content);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error();
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v !== 'string') throw new Error();
        credentials[k] = v;
      }
    } else
      mappings('--credential-env', (slot, value) => {
        credentials[slot] = value;
      });
    mappings('--input-env', (key, value) => {
      inputs[key] = JSON.parse(value);
    });
    if (embedded && (single.has('--manifest') || single.has('--manifest-hash')))
      throw new Error();
    let source = embedded;
    if (!source) {
      const file = await readFile(required('--manifest'));
      if (file.length > 4194304) throw new Error();
      source = {
        manifest: JSON.parse(file.toString('utf8')),
        manifestHash: required('--manifest-hash'),
      };
    }
    const result = await runRegression(
      source.manifest,
      source.manifestHash,
      {
        target,
        addresses,
        approvedOperations,
        mutationsAcknowledged,
        budget: { requests, milliseconds, requestTimeoutMs },
        credentials,
        inputs,
      },
      abort.signal,
    );
    return {
      result,
      exitCode: result.result === 'PASS' ? 0 : result.result === 'FAIL' ? 1 : 2,
    };
  } catch {
    // Never print argv, environment, raw parse errors, target responses or secrets.
    return {
      result: {
        context: 'INDEPENDENT',
        result: 'ERROR',
        reason: 'INVALID CLI INVOCATION',
        usedRequests: 0,
      },
      exitCode: 2,
    };
  } finally {
    process.off('SIGINT', cancel);
    process.off('SIGTERM', cancel);
  }
}
export async function regressionMain(embedded?: {
  manifest: unknown;
  manifestHash: string;
}) {
  const r = await regressionCli(process.argv.slice(2), embedded);
  process.stdout.write(JSON.stringify(r.result) + '\n');
  process.exitCode = r.exitCode;
}
export function isDirectInvocation(moduleUrl: string) {
  return (
    !!process.argv[1] &&
    moduleUrl === pathToFileURL(realpathSync(resolve(process.argv[1]))).href
  );
}
if (
  !(typeof GHOSTQA_BUNDLE !== 'undefined' && GHOSTQA_BUNDLE) &&
  isDirectInvocation(import.meta.url)
)
  await regressionMain();
