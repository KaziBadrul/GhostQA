import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Json } from '../contracts';
import { pointer, record, referenceProblem } from './references';
const legacy = new Ajv({
  strict: false,
  coerceTypes: false,
  validateFormats: true,
  logger: false,
});
const modern = new Ajv2020({
  strict: false,
  coerceTypes: false,
  validateFormats: true,
  logger: false,
});
for (const validator of [legacy, modern])
  addFormats(validator, { formats: ['email', 'uuid'] });
// No loadSchema/compileAsync: Ajv has no external resolution capability.
export function validInput(schema: Json, value: Json, version = '3.1.0') {
  try {
    return (version.startsWith('3.0') ? legacy : modern).validate(
      schema as object,
      value,
    );
  } catch {
    return false;
  }
}
export function compilable(schema: Json, version: string) {
  try {
    (version.startsWith('3.0') ? legacy : modern).compile(schema as object);
    return true;
  } catch {
    return false;
  }
}
export function normalizeNullable(schema: Json, version: string): Json {
  if (Array.isArray(schema))
    return schema.map((s) => normalizeNullable(s, version));
  if (!schema || typeof schema !== 'object') return schema;
  // OAS 3.0 Reference Objects ignore siblings. OAS 3.1 Schema Objects retain all siblings.
  if (version.startsWith('3.0') && typeof schema.$ref === 'string')
    return { $ref: schema.$ref };
  const result: Record<string, Json> = structuredClone(schema);
  delete result.nullable;
  for (const map of ['properties', '$defs', 'definitions'] as const)
    if (
      schema[map] &&
      typeof schema[map] === 'object' &&
      !Array.isArray(schema[map])
    )
      result[map] = Object.fromEntries(
        Object.entries(record(schema[map])).map(([key, child]) => [
          key,
          normalizeNullable(child, version),
        ]),
      );
  for (const key of ['items', 'additionalProperties'] as const)
    if (schema[key] && typeof schema[key] === 'object')
      result[key] = normalizeNullable(schema[key], version);
  if (
    version.startsWith('3.0') &&
    schema.nullable === true &&
    typeof schema.type === 'string'
  )
    result.type = [schema.type, 'null'];
  if (version.startsWith('3.0'))
    for (const [exclusive, bound] of [
      ['exclusiveMinimum', 'minimum'],
      ['exclusiveMaximum', 'maximum'],
    ] as const) {
      if (schema[exclusive] === true && typeof schema[bound] === 'number') {
        result[exclusive] = schema[bound];
        delete result[bound];
      } else if (typeof schema[exclusive] === 'boolean')
        delete result[exclusive];
    }
  return result;
}
// Carry the selected schema and only its bounded internal closure. Original JSON Pointers
// remain unchanged. Closure containers are annotations, not replacement validation rules.
export function preserveSchema(
  schema: Json,
  document: Json,
  version: string,
): Json {
  const problem = referenceProblem(schema, document);
  if (problem) throw new Error(problem);
  const closure: Record<string, Json> = {};
  const seen = new Set<string>();
  let nodes = 0;
  const collect = (value: Json): void => {
    if (++nodes > 100000) throw new Error('EXPANDED NODE LIMIT');
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string' && !seen.has(value.$ref)) {
      const ref = value.$ref;
      seen.add(ref);
      const target = pointer(document, ref.slice(1));
      if (target === undefined) throw new Error('UNRESOLVED REFERENCE');
      const parts = ref
        .slice(2)
        .split('/')
        .map((p) => p.replaceAll('~1', '/').replaceAll('~0', '~'));
      if (parts[0] === '$defs' || parts[0] === 'definitions')
        throw new Error('AMBIGUOUS REFERENCE NAMESPACE');
      let container = closure;
      for (const part of parts.slice(0, -1)) {
        container[part] ??= {};
        container = record(container[part]);
      }
      container[parts.at(-1)!] = normalizeNullable(target, version);
      collect(target);
    }
    for (const [key, child] of Object.entries(value))
      if (key !== '$ref') collect(child);
  };
  collect(schema);
  const namespace = version.startsWith('3.0') ? 'definitions' : '$defs';
  return {
    ...closure,
    [namespace]: { ghostqaSelected: normalizeNullable(schema, version) },
    $ref: `#/${namespace}/ghostqaSelected`,
  };
}
