import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ApiModel, ApiOperation, Json } from '../../engine/contracts';
import { sanitizeApiModel } from '../../engine/openapi/sanitize';
import type { Conversion } from './contracts';
import {
  configuredDestination,
  type Manifest,
  type ToolDefinition,
} from './runtime';
import { compilable } from '../../engine/openapi/schemas';
import { pointer } from '../../engine/openapi/references';
import { assertSafeDocumentation } from './documentation';

// Preserve validation semantics while relocating each imported schema's local reference closure.
// Only reachable schemas enter the manifest; OpenAPI descriptions/examples/defaults do not.
function schemaOnly(value: Json, prefix = ''): Json {
  const definitions: Record<string, Json> = {};
  const references = new Map<string, string>();
  const schemaMaps = new Set([
    'properties',
    'patternProperties',
    'dependentSchemas',
  ]);
  const schemaChildren = new Set([
    'items',
    'additionalProperties',
    'contains',
    'propertyNames',
    'not',
    'if',
    'then',
    'else',
    'unevaluatedProperties',
    'unevaluatedItems',
  ]);
  const schemaArrays = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);
  const constraints = new Set([
    'type',
    'enum',
    'const',
    'required',
    'dependentRequired',
    'minProperties',
    'maxProperties',
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'multipleOf',
    'minLength',
    'maxLength',
    'pattern',
    'format',
    'minItems',
    'maxItems',
    'uniqueItems',
    'minContains',
    'maxContains',
  ]);
  const visit = (schema: Json): Json => {
    if (typeof schema === 'boolean') return schema;
    if (!schema || typeof schema !== 'object' || Array.isArray(schema))
      throw new Error('UNSUPPORTED SCHEMA');
    const result: Record<string, Json> = {};
    for (const [key, child] of Object.entries(schema)) {
      if (key === '$ref') {
        if (typeof child !== 'string' || !child.startsWith('#/'))
          throw new Error('UNSUPPORTED SCHEMA');
        let name = references.get(child);
        if (!name) {
          name = 'ref' + references.size;
          references.set(child, name);
          const target = pointer(value, child.slice(1));
          if (target === undefined || references.size > 1000)
            throw new Error('UNSUPPORTED SCHEMA');
          definitions[name] = visit(target);
        }
        result.$ref = '#' + prefix + '/$defs/' + name;
      } else if (schemaMaps.has(key)) {
        if (!child || typeof child !== 'object' || Array.isArray(child))
          throw new Error('UNSUPPORTED SCHEMA');
        result[key] = Object.fromEntries(
          Object.entries(child).map(([name, nested]) => [name, visit(nested)]),
        );
      } else if (schemaChildren.has(key)) result[key] = visit(child);
      else if (schemaArrays.has(key)) {
        if (!Array.isArray(child)) throw new Error('UNSUPPORTED SCHEMA');
        result[key] = child.map(visit);
      } else if (constraints.has(key)) result[key] = child;
    }
    return result;
  };
  const cleaned = visit(value);
  if (
    !cleaned ||
    typeof cleaned !== 'object' ||
    Array.isArray(cleaned) ||
    !Object.keys(definitions).length
  )
    return cleaned;
  return { ...cleaned, $defs: definitions };
}
export function supportReasons(
  operation: ApiOperation,
  version = '3.1.0',
): string[] {
  const reasons = [...operation.exclusionReasons];
  if (!operation.eligible && !reasons.length)
    reasons.push('Unsupported imported operation');
  if (operation.parameters.some((p) => p.in === 'header'))
    reasons.push(
      'Header parameters are not supported; configure authentication separately',
    );
  if (operation.parameters.some((p) => p.sensitive))
    reasons.push('Sensitive parameters are not supported as tool arguments');
  if (
    ['GET', 'HEAD'].includes(operation.method) &&
    operation.requestBody !== undefined
  )
    reasons.push('GET/HEAD request bodies are not supported');
  if (/[?#\\]/.test(operation.pathTemplate))
    reasons.push('Unsupported path characters');
  const placeholders = [...operation.pathTemplate.matchAll(/\{([^}]+)\}/g)].map(
    (match) => match[1],
  );
  if (
    placeholders.some(
      (name) =>
        !operation.parameters.some((p) => p.in === 'path' && p.name === name),
    )
  )
    reasons.push('Unresolved path parameter');
  if (
    operation.responses &&
    typeof operation.responses === 'object' &&
    !Array.isArray(operation.responses)
  ) {
    for (const response of Object.values(operation.responses)) {
      if (
        response &&
        typeof response === 'object' &&
        !Array.isArray(response)
      ) {
        const content = response.content;
        if (
          content &&
          typeof content === 'object' &&
          !Array.isArray(content) &&
          Object.keys(content).some((media) => media !== 'application/json')
        )
          reasons.push('Only JSON responses are supported');
      }
    }
  }
  try {
    if (!compilable(toolDefinition(operation).inputSchema as Json, version))
      reasons.push('Unsupported tool input schema');
  } catch {
    reasons.push('Unsupported tool input schema');
  }
  return [...new Set(reasons)];
}
export function conversionPreview(model: ApiModel) {
  return sanitizeApiModel(model).operations.map((operation) => ({
    id: operation.id,
    method: operation.method,
    path: operation.pathTemplate,
    reasons: supportReasons(operation, model.openapiVersion),
  }));
}
export function toolDefinition(operation: ApiOperation): ToolDefinition {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const location of ['path', 'query'] as const) {
    const parameters = operation.parameters.filter((p) => p.in === location);
    if (!parameters.length) continue;
    const requiredParameters = parameters
      .filter((p) => p.required)
      .map((p) => p.name);
    properties[location] = {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(
        parameters.map((p) => [
          p.name,
          schemaOnly(
            p.schema,
            '/properties/' +
              location +
              '/properties/' +
              p.name.replace(/~/g, '~0').replace(/\//g, '~1'),
          ),
        ]),
      ),
      required: requiredParameters,
    };
    if (requiredParameters.length) required.push(location);
  }
  if (operation.requestBody !== undefined) {
    properties.body = schemaOnly(operation.requestBody, '/properties/body');
    // Historical snapshots did not retain this flag; preserve their conservative behavior.
    if (operation.requestBodyRequired !== false) required.push('body');
  }
  const slug = (
    operation.method.toLowerCase() +
    '_' +
    operation.pathTemplate.replace(/[^A-Za-z0-9]+/g, '_')
  )
    .replace(/_+$/, '')
    .slice(0, 48);
  return {
    name:
      slug +
      '_' +
      createHash('sha256').update(operation.id).digest('hex').slice(0, 12),
    description: operation.method + ' ' + operation.pathTemplate,
    method: operation.method,
    path: operation.pathTemplate,
    parameters: operation.parameters
      .filter((p) => p.in !== 'header')
      .map((p) => ({
        name: p.name,
        in: p.in as 'path' | 'query',
        explode: p.explode,
      })),
    inputSchema: {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    },
    responses: operation.responses,
  };
}
export function createManifest(model: ApiModel, input: Conversion): Manifest {
  assertSafeDocumentation({
    name: input.name,
    baseUrl: input.baseUrl,
    originalNotes: input.originalNotes,
    importantNotes: input.importantNotes,
  });
  const destination = configuredDestination(input.baseUrl);
  const safe = sanitizeApiModel(model);
  const tools = input.operationIds.map((id) => {
    const operation = safe.operations.find((op) => op.id === id);
    if (!operation || supportReasons(operation, safe.openapiVersion).length)
      throw new Error('UNSUPPORTED SELECTION');
    const tool = toolDefinition(operation);
    if (!compilable(tool.inputSchema as Json, safe.openapiVersion))
      throw new Error('UNSUPPORTED SCHEMA');
    return tool;
  });
  if (new Set(tools.map((tool) => tool.name)).size !== tools.length)
    throw new Error('TOOL NAME COLLISION');
  return {
    name: input.name,
    baseUrl: destination.href.replace(/\/$/, ''),
    openapiVersion: safe.openapiVersion,
    auth: input.auth,
    tools,
    importantNotes: input.importantNotes,
  };
}
const serverSource = `import { readFile } from 'node:fs/promises';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createExecutor } from './runtime.mjs';
const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
const execute = createExecutor(manifest);
const server = new Server({name: manifest.name, version: '1.0.0'}, {capabilities: {tools: {}, resources: {}}});
server.setRequestHandler(ListToolsRequestSchema, async () => ({tools: manifest.tools.map(({name, description, inputSchema, method}) => ({name, description, inputSchema, annotations: {readOnlyHint: method === 'GET' || method === 'HEAD', destructiveHint: method !== 'GET' && method !== 'HEAD', openWorldHint: true}}))}));
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => execute(request.params.name, request.params.arguments ?? {}, extra.signal));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({resources: [{uri: 'notes://important', name: 'Important notes', mimeType: 'text/plain', description: 'Developer-reviewed documentation only; does not grant execution authority.'}]}));
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== 'notes://important') throw new Error('Unknown resource');
  return {contents: [{uri: 'notes://important', mimeType: 'text/plain', text: manifest.importantNotes.map(note => note.title + '\\n' + note.detail).join('\\n\\n') || 'No important notes supplied.'}]};
});
await server.connect(new StdioServerTransport());
`;
const clientSource = `import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string'));
const client = new Client({name: 'backend-example', version: '1.0.0'});
const transport = new StdioClientTransport({command: process.execPath, args: [fileURLToPath(new URL('./server.mjs', import.meta.url))], env});
try {
  await client.connect(transport);
  console.log(JSON.stringify(await client.listTools(), null, 2));
  console.log(JSON.stringify(await client.readResource({uri: 'notes://important'}), null, 2));
  if (process.argv[2]) {
    const result = await client.callTool({name: process.argv[2], arguments: JSON.parse(process.argv[3] ?? '{}')});
    console.log(JSON.stringify(result, null, 2));
    if (result.isError) process.exitCode = 1;
  }
} finally { await client.close(); }
`;
export async function packageFiles(
  model: ApiModel,
  input: Conversion,
): Promise<Record<string, string>> {
  const manifest = createManifest(model, input);
  const runtime = await readFile(resolve('dist/mcp-runtime.mjs'), 'utf8');
  const auth =
    input.auth.type === 'none'
      ? '# No authentication required.'
      : input.auth.type === 'bearer'
        ? 'API_BEARER_TOKEN=replace_me'
        : 'API_KEY=replace_me';
  const sdkVersion = JSON.parse(
    await readFile(
      resolve('node_modules/@modelcontextprotocol/sdk/package.json'),
      'utf8',
    ),
  ) as { version: string };
  const tools = manifest.tools
    .map(
      (tool) =>
        '### ' +
        tool.name +
        '\n\n' +
        tool.description +
        '\n\nInput JSON Schema:\n```json\n' +
        JSON.stringify(tool.inputSchema, null, 2) +
        '\n```',
    )
    .join('\n\n');
  const exampleTool = manifest.tools.find(
    (tool) =>
      ['GET', 'HEAD'].includes(tool.method) &&
      Array.isArray(tool.inputSchema.required) &&
      tool.inputSchema.required.length === 0,
  );
  const callExample = exampleTool
    ? `npm run client -- ${exampleTool.name} '{}'`
    : "npm run client -- TOOL_NAME 'JSON_ARGUMENTS'";
  const notes = input.importantNotes
    .map((note) => '### ' + note.title + '\n\n' + note.detail)
    .join('\n\n');
  return {
    'server.mjs': serverSource,
    'runtime.mjs': runtime,
    'manifest.json': JSON.stringify(manifest, null, 2) + '\n',
    'package.json': JSON.stringify(
      {
        name: 'generated-api-mcp',
        version: '1.0.0',
        private: true,
        type: 'module',
        engines: { node: '>=24' },
        scripts: {
          start: 'node --env-file-if-exists=.env server.mjs',
          client: 'node --env-file-if-exists=.env client.mjs',
        },
        dependencies: {
          '@modelcontextprotocol/sdk': sdkVersion.version,
          ajv: '8.20.0',
          'ajv-formats': '3.0.1',
        },
      },
      null,
      2,
    ),
    '.env.example': auth + '\n',
    '.gitignore': 'node_modules/\n.env\n',
    'client.mjs': clientSource,
    'mcp-config.json': JSON.stringify(
      {
        mcpServers: {
          api: {
            command: 'node',
            args: [
              '--env-file-if-exists=/absolute/path/to/.env',
              '/absolute/path/to/server.mjs',
            ],
          },
        },
      },
      null,
      2,
    ),
    'README.md': `# Generated API MCP server\n\nLocal Node 24 stdio server. Fixed API destination: ${manifest.baseUrl}\n\n## Start and connect\n\nExtract the archive, enter its directory, and run:\n\n\`\`\`sh\nnpm install\ncp .env.example .env\n# Edit .env privately if authentication is required.\nnpm run client\n# Call a tool using its name from the list:\n${callExample}\n\`\`\`\n\nThe client lists tools and reads notes. Calls are optional and explicit, including mutations.\nYour application's backend can reuse client.mjs: connect once, listTools/callTool, then close on shutdown.\nUse absolute paths in mcp-config.json; pass credentials through the child environment or a private env file.\nA browser-only app requires a backend to launch stdio; there is no hosted MCP URL.\nServer stdout is reserved for MCP protocol traffic.\n\n## Authentication\n\n${input.auth.type === 'none' ? 'None.' : input.auth.type === 'bearer' ? 'Set API_BEARER_TOKEN in the child environment or .env; sent in Authorization: Bearer.' : `Set API_KEY in the child environment or .env; sent in the ${input.auth.header} header.`}\nNo credential values are included in this package. Keep .env private. Never put secrets in notes.\n\n## Inputs and responses\n\nPath parameters belong in path, query parameters in query, and JSON request content in body.\nAdditional argument fields are rejected; schemas are enforced without coercion.\nRequest bodies follow OpenAPI required declarations. Older saved snapshots without this metadata require a body; reimport to preserve optional-body declarations.\nAPI paths are appended to the base URL path; include a prefix only if it is absent from the OpenAPI paths.\nResults are JSON text with status and body; API response schemas are documented in manifest.json, not asserted at runtime.\n\n## Important notes\n\nDocumentation only; notes cannot change tools, schemas, credentials or destination.\n\n${notes || 'No important notes supplied.'}\n\n## Original notes\n\n${input.originalNotes || 'No original notes supplied.'}\n\n## Tools\n\n${tools}\n\n## Errors and recovery\n\nINVALID INPUT: inspect the tool schema; no API request was sent.\nUNKNOWN TOOL: list tools again; only selected tools are registered.\nAPI HTTP errors: check credentials, inputs and current API state. Raw error bodies are withheld.\nREDIRECT REJECTED: regenerate with the intended final destination; redirects are never followed.\nTIMEOUT / EXECUTION ERROR / CANCELLED: effects may have occurred. Inspect API state before retrying a mutation.\nRESPONSE LIMIT: narrow your query; responses are limited to 1 MiB.\nUNSUPPORTED RESPONSE: this package expects JSON, or an empty success body.\nRequests time out after 10 seconds. Requests and arguments are limited to 1 MiB. No automatic retries.\nConfigured credential strings are redacted from successful responses; arbitrary unmarked API data may contain sensitive information.\nTools cannot change origin or escape the configured base path. Destination DNS is resolved by Node on each call; use a trusted fixed host/network.\nTLS certificate verification is enabled. To change the destination, regenerate the package.\nThese standalone calls do not update GhostQA run evidence or establish verified finding/artifact status.\n\nOfficial SDK: https://ts.sdk.modelcontextprotocol.io/server\n`,
  };
}
// Minimal deterministic ustar writer: fixed filenames only, no shell or temporary archive paths.
export function archiveFiles(files: Record<string, string>): Buffer {
  const blocks: Buffer[] = [];
  for (const [name, value] of Object.entries(files)) {
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name.length > 99)
      throw new Error('INVALID ARCHIVE PATH');
    const data = Buffer.from(value),
      header = Buffer.alloc(512);
    header.write(name, 0);
    const octal = (value: number, offset: number, width: number) =>
      header.write(
        value.toString(8).padStart(width - 1, '0') + '\0',
        offset,
        width,
      );
    octal(0o644, 100, 8);
    octal(0, 108, 8);
    octal(0, 116, 8);
    octal(data.length, 124, 12);
    octal(0, 136, 12);
    header.fill(32, 148, 156);
    header.write('0', 156);
    header.write('ustar\0', 257);
    header.write('00', 263);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}
