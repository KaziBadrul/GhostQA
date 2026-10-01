import type { Json } from '../contracts';
export function record(value: unknown): Record<string, Json> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : {};
}
export function pointer(root: Json, path: string): Json | undefined {
  if (path === '') return root;
  if (!path.startsWith('/')) return undefined;
  let current: Json | undefined = root;
  for (const encoded of path.slice(1).split('/')) {
    if (/~(?![01])/.test(encoded)) return undefined;
    const key = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
    if (['__proto__', 'constructor', 'prototype'].includes(key))
      return undefined;
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, key))
      return undefined;
    current = (current as Record<string, Json>)[key];
  }
  return current;
}
export function referenceProblem(
  value: Json,
  root: Json,
  seen = new Set<string>(),
  depth = 0,
  budget = { nodes: 0 },
): string | undefined {
  if (++budget.nodes > 100000) return 'EXPANDED NODE LIMIT';
  if (depth > 100) return 'REFERENCE DEPTH LIMIT';
  if (Array.isArray(value)) {
    for (const v of value) {
      const error = referenceProblem(v, root, seen, depth + 1, budget);
      if (error) return error;
    }
  } else if (value && typeof value === 'object') {
    const ref = value.$ref;
    if (ref !== undefined) {
      if (typeof ref !== 'string' || !ref.startsWith('#/'))
        return 'REMOTE REFERENCE PROHIBITED';
      if (seen.has(ref)) return 'RECURSIVE REFERENCE';
      const target = pointer(root, ref.slice(1));
      if (target === undefined) return 'UNRESOLVED REFERENCE';
      const error = referenceProblem(
        target,
        root,
        new Set([...seen, ref]),
        depth,
        budget,
      );
      if (error) return error;
    }
    // Siblings remain independent constraints, including their own references.
    for (const [key, v] of Object.entries(value)) {
      if (key === '$ref') continue;
      const error = referenceProblem(v, root, seen, depth + 1, budget);
      if (error) return error;
    }
  }
}
// Resolve OpenAPI Reference Objects only. This is never used to flatten Schema Objects.
export function openapiObject(
  value: Json | undefined,
  root: Json,
): Record<string, Json> {
  let current = record(value);
  const seen = new Set<string>();
  while (typeof current.$ref === 'string') {
    const ref = current.$ref;
    if (!ref.startsWith('#/') || seen.has(ref))
      throw new Error('UNSUPPORTED REFERENCE');
    seen.add(ref);
    if (seen.size > 100) throw new Error('REFERENCE DEPTH LIMIT');
    const target = pointer(root, ref.slice(1));
    if (target === undefined) throw new Error('UNRESOLVED REFERENCE');
    current = record(target);
  }
  return current;
}
