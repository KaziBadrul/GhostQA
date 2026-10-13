import { randomUUID, createHash } from 'node:crypto';
import { validate } from '@scalar/openapi-parser';
import {
  ApiModelSchema,
  ApiParameterSchema,
  type Json,
  type ApiOperation,
  type ApiModel,
} from '../contracts';
import { record, referenceProblem, openapiObject } from './references';
import { schemaProblem, schemaType } from './profile';
import { preserveSchema, compilable, normalizeNullable } from './schemas';
import { pathSegments } from '../policy/scope';
const localReferenceDiagnostics = new Set([
  'EXTERNAL_REFERENCE_NOT_FOUND',
  'INTERNAL_REFERENCE_NOT_FOUND',
  'CIRCULAR_REFERENCE',
  'INVALID_REFERENCE',
  'SELF_REFERENCE',
]);
export async function modelDocument(document: Json): Promise<ApiModel> {
  const root = record(document),
    info = record(root.info),
    version = String(root.openapi);
  if (
    !/^3\.[01]\.\d+$/.test(version) ||
    typeof info.title !== 'string' ||
    typeof info.version !== 'string' ||
    !root.paths ||
    typeof root.paths !== 'object' ||
    Array.isArray(root.paths)
  )
    throw new Error('INVALID OPENAPI');
  const structure = await validate(structuredClone(root));
  if (
    !structure.valid &&
    (!structure.errors?.length ||
      structure.errors.some(
        (error) => !localReferenceDiagnostics.has(String(error.code)),
      ))
  )
    throw new Error('INVALID OPENAPI');
  const operations: ApiOperation[] = [];
  for (const [path, item] of Object.entries(record(root.paths))) {
    if (!path.startsWith('/')) throw new Error('INVALID OPENAPI');
    try {
      pathSegments(path);
    } catch {
      throw new Error('INVALID OPENAPI');
    }
    const pathItem = openapiObject(item, root);
    for (const [method, value] of Object.entries(pathItem)) {
      if (
        ![
          'get',
          'post',
          'put',
          'patch',
          'delete',
          'head',
          'options',
          'trace',
        ].includes(method)
      )
        continue;
      const reasons: string[] = [],
        id = `${method.toUpperCase()} ${path}`;
      const referenceError = referenceProblem(
        { operation: value, parameters: pathItem.parameters ?? [] },
        root,
      );
      if (referenceError) reasons.push(referenceError);
      if (method === 'trace') reasons.push('UNSUPPORTED METHOD');
      const operation = referenceError
        ? record(value)
        : openapiObject(value, root);
      const schema = (original: Json, generation: boolean): Json => {
        const issue = generation
          ? schemaProblem(normalizeNullable(original, version), 0, root)
          : referenceProblem(original, root);
        if (issue) {
          reasons.push(issue);
          return {};
        }
        try {
          const preserved = preserveSchema(original, root, version);
          if (!compilable(preserved, version)) reasons.push('AMBIGUOUS SCHEMA');
          return preserved;
        } catch (error) {
          reasons.push(
            error instanceof Error ? error.message : 'AMBIGUOUS SCHEMA',
          );
          return {};
        }
      };
      const parameters: ApiOperation['parameters'] = [];
      for (const entry of [
        ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
        ...(Array.isArray(operation.parameters) ? operation.parameters : []),
      ]) {
        let p: Record<string, Json>;
        try {
          p = openapiObject(entry, root);
        } catch {
          reasons.push('UNRESOLVED PARAMETER');
          continue;
        }
        if (!['path', 'query', 'header'].includes(String(p.in))) {
          reasons.push('UNSUPPORTED PARAMETER');
          continue;
        }
        const original = p.schema ?? {};
        const preserved = schema(original, true);
        const style = p.style ?? (p.in === 'query' ? 'form' : 'simple');
        const declaredType = schemaType(original, root);
        const type = Array.isArray(declaredType)
          ? declaredType.find((t) => t !== 'null')
          : declaredType;
        if (
          style !== (p.in === 'query' ? 'form' : 'simple') ||
          type === 'object' ||
          (type === 'array' && p.in !== 'query') ||
          (type === 'array' && typeof p.explode !== 'boolean')
        )
          reasons.push('UNSUPPORTED SERIALIZATION');
        const parsed = ApiParameterSchema.safeParse({
          name: p.name,
          in: p.in,
          required: p.in === 'path' || p.required === true,
          schema: preserved,
          style,
          explode: p.explode ?? p.in === 'query',
          sensitive: p['x-sensitive'] === true,
        });
        if (parsed.success) {
          const previous = parameters.findIndex(
            (p) =>
              p.in === parsed.data.in &&
              (p.in === 'header'
                ? p.name.toLowerCase() === parsed.data.name.toLowerCase()
                : p.name === parsed.data.name),
          );
          if (previous >= 0) parameters[previous] = parsed.data;
          else parameters.push(parsed.data);
        } else reasons.push('INVALID PARAMETER');
      }
      let requestBody: Json | undefined;
      let requestBodyRequired: boolean | undefined;
      if (operation.requestBody !== undefined) {
        let body: Record<string, Json>;
        try {
          body = openapiObject(operation.requestBody, root);
        } catch {
          body = {};
          reasons.push('UNRESOLVED REQUEST BODY');
        }
        requestBodyRequired = body.required === true;
        const content = record(body.content);
        if (Object.keys(content).length !== 1 || !content['application/json'])
          reasons.push('UNSUPPORTED MEDIA TYPE');
        else
          requestBody = schema(
            record(content['application/json']).schema ?? {},
            true,
          );
      }
      const responses: Record<string, Json> = {};
      for (const [status, entry] of Object.entries(
        record(operation.responses),
      )) {
        let response: Record<string, Json>;
        try {
          response = openapiObject(entry, root);
        } catch {
          reasons.push('UNRESOLVED RESPONSE');
          continue;
        }
        const content: Record<string, Json> = {};
        for (const [media, value] of Object.entries(record(response.content))) {
          const original = record(value);
          content[media] = {
            ...original,
            ...(original.schema === undefined
              ? {}
              : { schema: schema(original.schema, false) }),
          };
        }
        responses[status] = {
          ...response,
          ...(response.content === undefined ? {} : { content }),
        };
      }
      operations.push({
        id,
        method: (method === 'trace'
          ? 'OPTIONS'
          : method.toUpperCase()) as ApiOperation['method'],
        pathTemplate: path,
        parameters,
        ...(requestBody === undefined
          ? {}
          : { requestBody, requestBodyRequired }),
        responses,
        eligible: reasons.length === 0,
        exclusionReasons: [...new Set(reasons)],
      });
    }
  }
  return ApiModelSchema.parse({
    snapshotId: randomUUID(),
    contentHash: createHash('sha256')
      .update(JSON.stringify(root))
      .digest('hex'),
    openapiVersion: version,
    operations,
    importDiagnostics: operations
      .filter((o) => !o.eligible)
      .map((o) => ({ operationId: o.id, reasons: o.exclusionReasons })),
  });
}
