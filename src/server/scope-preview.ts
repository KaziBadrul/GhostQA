import { lookup } from 'node:dns/promises';
import { createHash, randomUUID } from 'node:crypto';
import { approveScope } from '../engine/policy/scope';
import type { FrozenScope } from '../engine/contracts';
export async function previewScope(
  target: string,
  policy: FrozenScope['operationPolicy'],
  mutationsAcknowledged: boolean,
) {
  const hostname = new URL(target).hostname.replace(/^\[|\]$/g, '');
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('DNS TIMEOUT')), 3000);
  });
  try {
    const addresses = await Promise.race([
      lookup(hostname, { all: true }),
      timeout,
    ]);
    const scope = approveScope(
      target,
      addresses.map((a) => ({ ip: a.address, family: a.family as 4 | 6 })),
      policy,
      mutationsAcknowledged,
      randomUUID(),
    );
    const expiresAt = Date.now() + 60000;
    const hash = createHash('sha256')
      .update(JSON.stringify({ scope, expiresAt }))
      .digest('hex');
    return { scope, expiresAt, hash };
  } finally {
    clearTimeout(timer);
  }
}
export function validatePreview(
  preview: Awaited<ReturnType<typeof previewScope>>,
  hash: string,
) {
  if (
    Date.now() >= preview.expiresAt ||
    hash !==
      createHash('sha256')
        .update(
          JSON.stringify({
            scope: preview.scope,
            expiresAt: preview.expiresAt,
          }),
        )
        .digest('hex')
  )
    throw new Error('STALE APPROVAL');
  return structuredClone(preview.scope);
}
