import { z } from 'zod';
import { ProposalSchema } from '../mapping/state';
import { StateMappingSchema } from '../contracts';

// Refinements are not represented by JSON Schema. Make the proposal-only
// provenance requirements visible to generation without changing local authority.
const GenerationProposalSchema = ProposalSchema.extend({
  mappings: z
    .array(
      StateMappingSchema.safeExtend({
        kind: z.enum(['INFERRED_DEPENDENCY', 'HYPOTHESIZED_STATE']),
        rationale: z.string().min(1),
      }),
    )
    .max(100),
});

// Generation guidance only. Free JSON stays generic: no target-specific names.
// Avoid recursive required JSON unions in the remote structured-output grammar.
function jsonValue(): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: true,
  };
}

// Project schema nodes, never arbitrary property dictionaries or enum values.
// Unknown keywords, formats, refs and Zod metadata cannot reach the SDK.
export function projectGeminiSchema(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID GENERATION SCHEMA');
  const node = value as Record<string, unknown>;
  if ('$ref' in node) return jsonValue();
  const output: Record<string, unknown> = {};
  const types = [
    'string',
    'number',
    'integer',
    'boolean',
    'null',
    'object',
    'array',
  ];
  if (typeof node.type === 'string' && types.includes(node.type))
    output.type = node.type;
  else if (
    Array.isArray(node.type) &&
    node.type.length &&
    node.type.every((t) => typeof t === 'string' && types.includes(t))
  )
    output.type = node.type;
  for (const key of ['anyOf', 'oneOf'] as const)
    if (Array.isArray(node[key]) && node[key].length)
      output[key] = node[key].map(projectGeminiSchema);
  if (
    node.properties &&
    typeof node.properties === 'object' &&
    !Array.isArray(node.properties)
  ) {
    output.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, schema]) => [
        key,
        projectGeminiSchema(schema),
      ]),
    );
    if (
      Array.isArray(node.required) &&
      node.required.every(
        (key) =>
          typeof key === 'string' &&
          Object.hasOwn(node.properties as object, key),
      )
    )
      output.required = node.required;
  }
  if (node.items && typeof node.items === 'object')
    output.items = projectGeminiSchema(node.items);
  if (typeof node.additionalProperties === 'boolean')
    output.additionalProperties = node.additionalProperties;
  // Array bounds multiply this model's structured-output grammar complexity.
  // The authoritative Zod contract and deterministic budgets enforce them.
  for (const key of ['minimum', 'maximum'] as const)
    if (typeof node[key] === 'number' && Number.isFinite(node[key]))
      output[key] = node[key];
  const enumeration = Object.hasOwn(node, 'const') ? [node.const] : node.enum;
  if (
    Array.isArray(enumeration) &&
    enumeration.length &&
    enumeration.every(
      (v) =>
        typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)),
    )
  )
    output.enum = enumeration;
  if (!('type' in output) && !('anyOf' in output) && !('oneOf' in output))
    throw new Error('INVALID GENERATION SCHEMA');
  return output;
}

export function journeyResponseSchema(): Record<string, unknown> {
  // One proposal envelope is the generation format. The local contract still
  // accepts legacy Journey replies. Duplicating both full schemas in a root
  // union exceeds this model's structured-output complexity tolerance.
  return projectGeminiSchema(
    z.toJSONSchema(GenerationProposalSchema, { reused: 'inline' }),
  );
}
