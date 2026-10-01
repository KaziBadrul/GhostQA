import type { ApiModel, Json } from '../contracts';
import { SecretVault } from '../secrets/vault';
import { sensitiveName } from '../secrets/classify';
const annotations = new Set([
  'description',
  'title',
  'example',
  'examples',
  'default',
  'deprecated',
  'readOnly',
  'writeOnly',
]);
// Schema property names describe fields. They are not response values and must never
// trigger whole-schema redaction. Only data annotations and known literal secrets do.
export function sanitizeDocument(
  value: Json,
  vault: SecretVault,
  alreadySanitized = false,
): Json {
  const discover = (input: Json, field?: string): void => {
    if (Array.isArray(input)) {
      input.forEach((item) => discover(item, field));
      return;
    }
    if (!input || typeof input !== 'object') return;
    if (input.kind === 'literal' && input.value !== undefined)
      vault.sanitize(input.value, alreadySanitized);
    for (const [key, child] of Object.entries(input)) {
      if (key === 'properties' || key === 'schemas') {
        if (child && typeof child === 'object' && !Array.isArray(child))
          for (const [name, schema] of Object.entries(child))
            discover(schema, name);
      } else if (key === 'body') {
        vault.sanitize(child, alreadySanitized);
      } else if (['default', 'example', 'examples', 'enum'].includes(key)) {
        if (field && sensitiveName(field, vault.selectors)) {
          if (Array.isArray(child))
            child.forEach((item) =>
              alreadySanitized
                ? vault.sanitize({ [field]: item }, true)
                : vault.register(item),
            );
          else if (alreadySanitized) vault.sanitize({ [field]: child }, true);
          else vault.register(child);
        }
        vault.sanitize(child, alreadySanitized);
      } else discover(child, field);
    }
  };
  discover(value);
  const clean = (input: Json): Json => {
    if (typeof input === 'string')
      return vault.sanitize(input, alreadySanitized);
    if (Array.isArray(input)) return input.map(clean);
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(
      Object.entries(input).map(([key, child]) => [
        key,
        annotations.has(key)
          ? vault.sanitize(child, alreadySanitized)
          : clean(child),
      ]),
    );
  };
  return clean(value);
}
function semantics(value: Json): Json {
  if (Array.isArray(value)) return value.map(semantics);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !annotations.has(key))
      .map(([key, child]) => [
        key,
        ['properties', '$defs', 'definitions', 'schemas'].includes(key) &&
        child &&
        typeof child === 'object' &&
        !Array.isArray(child)
          ? Object.fromEntries(
              Object.entries(child).map(([name, schema]) => [
                name,
                semantics(schema),
              ]),
            )
          : semantics(child),
      ]),
  );
}
export function sanitizeApiModel(model: ApiModel): ApiModel {
  const vault = new SecretVault();
  try {
    const safe = sanitizeDocument(
      model as unknown as Json,
      vault,
    ) as unknown as ApiModel;
    for (let i = 0; i < model.operations.length; i++) {
      const original = model.operations[i]!,
        operation = safe.operations[i]!;
      if (
        JSON.stringify(semantics(original as unknown as Json)) !==
        JSON.stringify(semantics(operation as unknown as Json))
      ) {
        operation.eligible = false;
        operation.exclusionReasons.push('SECRET SCHEMA CONSTRAINT WITHHELD');
        safe.importDiagnostics.push({
          operationId: operation.id,
          reasons: ['SECRET SCHEMA CONSTRAINT WITHHELD'],
        });
      }
    }
    return safe;
  } finally {
    vault.discard();
  }
}
