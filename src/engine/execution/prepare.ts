import { z } from 'zod';
import {
  JsonSchema,
  type ApiModel,
  type FrozenScope,
  type Phase,
  type JourneyStep,
} from '../contracts';
import { validInput } from '../openapi/schemas';
import { injectAuthentication, serializedHeaders } from './auth';
import { assertUrl, authorizeOperation, pathSegments } from '../policy/scope';
const InputSchema = z.strictObject({
  path: z.record(z.string(), JsonSchema),
  query: z.record(z.string(), JsonSchema),
  headers: z.record(z.string(), JsonSchema),
  body: JsonSchema.optional(),
});
export type RequestInput = z.infer<typeof InputSchema>;
// Pure construction/validation. This function has no socket or dispatch authority.
export function prepareRequest(
  api: ApiModel,
  scope: FrozenScope,
  phase: Phase,
  step: JourneyStep,
  value: unknown,
  bindings: Parameters<typeof injectAuthentication>[1],
  credentials: ReadonlyMap<string, string>,
) {
  const input = InputSchema.parse(value);
  const operation = api.operations.find((o) => o.id === step.operationId);
  if (!operation?.eligible) throw new Error('OPERATION FORBIDDEN');
  authorizeOperation(scope, operation.id, phase);
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(operation.method) &&
    !scope.mutationsAcknowledged
  )
    throw new Error('MUTATION NOT APPROVED');
  const boundHeaders = injectAuthentication(
    input.headers,
    bindings,
    credentials,
  );
  const query = { ...input.query };
  let path = operation.pathTemplate;
  for (const location of ['path', 'query', 'header'] as const) {
    const values =
      location === 'path'
        ? input.path
        : location === 'query'
          ? query
          : boundHeaders;
    const declared = operation.parameters.filter((p) => p.in === location);
    for (const name of Object.keys(values))
      if (
        !declared.some(
          (p) =>
            (location === 'header' ? p.name.toLowerCase() : p.name) === name,
        ) &&
        !bindings.some(
          (b) =>
            b.location === (location === 'header' ? 'header' : 'query') &&
            b.name.toLowerCase() === name.toLowerCase(),
        )
      )
        throw new Error('UNKNOWN PARAMETER');
    for (const parameter of declared) {
      const name =
        location === 'header' ? parameter.name.toLowerCase() : parameter.name;
      const supplied = values[name];
      if (supplied === undefined) {
        if (parameter.required) throw new Error('MISSING PARAMETER');
        continue;
      }
      if (!validInput(parameter.schema, supplied, api.openapiVersion))
        throw new Error('INVALID PARAMETER');
      if (location === 'path')
        path = path.replaceAll(
          `{${parameter.name}}`,
          encodeURIComponent(String(supplied)),
        );
    }
  }
  if (path.includes('{')) throw new Error('MISSING PATH VALUE');
  if (operation.requestBody !== undefined) {
    if (
      input.body === undefined ||
      !validInput(operation.requestBody, input.body, api.openapiVersion)
    )
      throw new Error('INVALID BODY');
  } else if (input.body !== undefined) throw new Error('UNDECLARED BODY');
  if (
    input.body !== undefined &&
    Buffer.byteLength(JSON.stringify(input.body)) > 1048576
  )
    throw new Error('REQUEST LIMIT');
  const headers = serializedHeaders(boundHeaders);
  pathSegments(path);
  const url = assertUrl(scope, new URL(path, scope.origin).href);
  for (const parameter of operation.parameters.filter(
    (p) => p.in === 'query',
  )) {
    const supplied = query[parameter.name];
    if (supplied === undefined) continue;
    if (Array.isArray(supplied)) {
      if (parameter.explode)
        for (const item of supplied)
          url.searchParams.append(parameter.name, String(item));
      else url.searchParams.set(parameter.name, supplied.map(String).join(','));
    } else url.searchParams.set(parameter.name, String(supplied));
  }
  return { operation, input, url, headers };
}
