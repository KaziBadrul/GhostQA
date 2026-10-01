import {
  defaultModelRequestsPerMinute,
  ModelRequestsPerMinuteSchema,
} from '../engine/planning/pacing';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const environment = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(?:ql)?:\/\//)
    .pipe(z.url()),
  GHOSTQA_CREDENTIAL_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  GEMINI_MODEL: z.string().trim().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_REQUESTS_PER_MINUTE: z.preprocess(
    (value) =>
      value === undefined ? defaultModelRequestsPerMinute : Number(value),
    ModelRequestsPerMinuteSchema,
  ),
});

export function readConfig(input: Record<string, string | undefined>) {
  const result = environment.safeParse(input);
  if (!result.success)
    throw new Error(
      'Invalid application configuration: ' +
        [...new Set(result.error.issues.map((issue) => String(issue.path[0])))]
          .sort()
          .join(', '),
    );
  return Object.freeze({
    databaseUrl: result.data.DATABASE_URL,
    credentialKey: Buffer.from(result.data.GHOSTQA_CREDENTIAL_KEY, 'hex'),
    geminiModel: result.data.GEMINI_MODEL,
    geminiRequestsPerMinute: result.data.GEMINI_REQUESTS_PER_MINUTE,
    geminiApiKey: result.data.GEMINI_API_KEY,
    hostname: '127.0.0.1',
    limits: Object.freeze({
      requests: 200,
      milliseconds: 600000,
      journeys: 20,
      steps: 10,
      requestTimeoutMs: 10000,
      modelTimeoutMs: 30000,
    }),
  });
}

export function loadLocalEnvironment(directory = process.cwd()) {
  for (const name of ['.env.local', '.env']) {
    const file = resolve(directory, name);
    if (existsSync(file)) {
      try {
        loadEnvFile(file);
      } catch {
        throw new Error('Invalid environment file: ' + name);
      }
    }
  }
}
