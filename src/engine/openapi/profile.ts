import type { Json } from '../contracts';
import { pointer, record } from './references';
const supported = new Set([
  '$ref',
  '$schema',
  'type',
  'nullable',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'format',
  'description',
  'title',
  'default',
  'example',
  'examples',
  'readOnly',
  'writeOnly',
  'deprecated',
  'x-sensitive',
]);
export function schemaProblem(
  value: Json,
  depth = 0,
  root: Json = value,
  seen = new Set<string>(),
  inheritedType?: Json,
): string | undefined {
  const s = record(value);
  const boundsProblem = generationBoundsProblem(value, root);
  if (boundsProblem) return boundsProblem;
  if (depth > 10) return 'SCHEMA DEPTH LIMIT';
  if (
    Object.keys(s).some((key) => !supported.has(key) && !key.startsWith('x-'))
  )
    return 'UNSUPPORTED SCHEMA KEYWORD';
  if (
    s.$schema !== undefined &&
    s.$schema !== 'https://json-schema.org/draft/2020-12/schema'
  )
    return 'UNSUPPORTED SCHEMA DIALECT';
  let type = s.type ?? inheritedType;
  if (s.$ref !== undefined) {
    if (typeof s.$ref !== 'string' || !s.$ref.startsWith('#/'))
      return 'REMOTE REFERENCE PROHIBITED';
    if (seen.has(s.$ref)) return 'RECURSIVE REFERENCE';
    const target = pointer(root, s.$ref.slice(1));
    if (target === undefined) return 'UNRESOLVED REFERENCE';
    const problem = schemaProblem(
      target,
      depth,
      root,
      new Set([...seen, s.$ref]),
    );
    if (problem) return problem;
    let targetSchema = record(target);
    const chain = new Set<string>();
    while (
      targetSchema.type === undefined &&
      typeof targetSchema.$ref === 'string'
    ) {
      if (chain.has(targetSchema.$ref)) return 'RECURSIVE REFERENCE';
      chain.add(targetSchema.$ref);
      targetSchema = record(pointer(root, targetSchema.$ref.slice(1)));
    }
    type ??= targetSchema.type;
  }
  if ('pattern' in s) return 'UNSUPPORTED PATTERN';
  if (s.format !== undefined && !['email', 'uuid'].includes(String(s.format)))
    return 'UNSUPPORTED FORMAT';
  const types = Array.isArray(type) ? type : [type];
  if (
    !types.every(
      (t) =>
        typeof t === 'string' &&
        [
          'string',
          'number',
          'integer',
          'boolean',
          'object',
          'array',
          'null',
        ].includes(t),
    ) ||
    types.length > 2 ||
    (types.length === 2 && !types.includes('null'))
  )
    return 'AMBIGUOUS TYPE';
  if ((Number(s.minLength) || 0) > Math.min(256, Number(s.maxLength ?? 256)))
    return 'STRING GENERATION LIMIT';
  if ((Number(s.minItems) || 0) > Math.min(20, Number(s.maxItems ?? 20)))
    return 'ARRAY GENERATION LIMIT';
  if (
    Math.max(-1000000, Number(s.minimum ?? -1000000)) >
    Math.min(1000000, Number(s.maximum ?? 1000000))
  )
    return 'NUMBER GENERATION LIMIT';
  if (s.enum !== undefined && (!Array.isArray(s.enum) || s.enum.length === 0))
    return 'INCONSISTENT ENUM';
  if (types.includes('object')) {
    const props = record(s.properties);
    if (
      s.required !== undefined &&
      (!Array.isArray(s.required) ||
        s.required.some(
          (k) => typeof k !== 'string' || !Object.hasOwn(props, k),
        ))
    )
      return 'UNDECLARED REQUIRED PROPERTY';
    if (s.$ref === undefined && s.properties === undefined)
      return 'FREE FORM SCHEMA';
    for (const child of Object.values(props)) {
      const problem = schemaProblem(child, depth + 1, root, seen);
      if (problem) return problem;
    }
  }
  if (
    types.includes('array') &&
    (s.$ref === undefined || s.items !== undefined)
  ) {
    if (s.items === undefined) return 'MISSING ITEMS';
    const problem = schemaProblem(s.items, depth + 1, root, seen);
    if (problem) return problem;
  }
}

export function schemaType(schema: Json, root: Json): Json | undefined {
  let value = record(schema);
  const seen = new Set<string>();
  while (value.type === undefined && typeof value.$ref === 'string') {
    if (!value.$ref.startsWith('#/') || seen.has(value.$ref)) return undefined;
    seen.add(value.$ref);
    value = record(pointer(root, value.$ref.slice(1)));
  }
  return value.type;
}

// This only checks finite generation feasibility. Ajv remains the sole validator.
export function generationBoundsProblem(
  schema: Json,
  root: Json,
): string | undefined {
  const branches: Record<string, Json>[] = [];
  const seen = new Set<string>();
  let current = record(schema);
  for (;;) {
    branches.push(current);
    if (typeof current.$ref !== 'string' || seen.has(current.$ref)) break;
    seen.add(current.$ref);
    current = record(pointer(root, current.$ref.slice(1)));
  }
  const declaredType = schemaType(schema, root);
  const type = Array.isArray(declaredType)
    ? declaredType.find((t) => t !== 'null')
    : declaredType;
  if (type === 'string' || type === 'array') {
    const lowerKey = type === 'string' ? 'minLength' : 'minItems',
      upperKey = type === 'string' ? 'maxLength' : 'maxItems';
    const lower = Math.max(0, ...branches.map((s) => Number(s[lowerKey] ?? 0)));
    const upper = Math.min(
      type === 'string' ? 256 : 20,
      ...branches.map((s) =>
        Number(s[upperKey] ?? (type === 'string' ? 256 : 20)),
      ),
    );
    if (lower > upper)
      return type === 'string'
        ? 'STRING GENERATION LIMIT'
        : 'ARRAY GENERATION LIMIT';
  }
  if (type === 'number' || type === 'integer') {
    let lower = -1000000,
      upper = 1000000,
      lowerExclusive = false,
      upperExclusive = false;
    for (const s of branches) {
      const minimum =
        typeof s.exclusiveMinimum === 'number'
          ? s.exclusiveMinimum
          : Number(s.minimum ?? -1000000);
      const maximum =
        typeof s.exclusiveMaximum === 'number'
          ? s.exclusiveMaximum
          : Number(s.maximum ?? 1000000);
      const strictLower =
        s.exclusiveMinimum === true || typeof s.exclusiveMinimum === 'number';
      const strictUpper =
        s.exclusiveMaximum === true || typeof s.exclusiveMaximum === 'number';
      if (minimum > lower) {
        lower = minimum;
        lowerExclusive = strictLower;
      } else if (minimum === lower) lowerExclusive ||= strictLower;
      if (maximum < upper) {
        upper = maximum;
        upperExclusive = strictUpper;
      } else if (maximum === upper) upperExclusive ||= strictUpper;
    }
    if (type === 'integer') {
      lower = lowerExclusive ? Math.floor(lower) + 1 : Math.ceil(lower);
      upper = upperExclusive ? Math.ceil(upper) - 1 : Math.floor(upper);
    }
    if (
      lower > upper ||
      (type === 'number' &&
        lower === upper &&
        (lowerExclusive || upperExclusive))
    )
      return 'NUMBER GENERATION LIMIT';
  }
}
