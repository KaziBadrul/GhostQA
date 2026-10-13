# OpenAPI → MCP product pivot

Approved scope: the owner's implementation request of 2026-10-03 adopts this feature.
Primary outcome: upload OpenAPI JSON/YAML and notes, choose endpoints and authentication,
download a local Node stdio MCP server, inspect its documentation, and connect a backend client.
Existing fuzzing specifications and immutable evidence remain authoritative for fuzzing runs.

## Accepted requirements
- Reuse the bounded, local-reference-only OpenAPI importer and saved project contracts.
- GET operations start selected. Every mutation requires an explicit endpoint selection.
- Support the importer's path/query serialization and JSON bodies; clearly exclude header
  parameters, unsupported response media, and importer-unsupported operations.
- Deterministic templates produce server.mjs, runtime.mjs, manifest.json, package.json,
  .env.example, README.md, client.mjs, and backend configuration in a tar.gz download.
- Official MCP TypeScript SDK v1, Node 24, stdio only; credentials come from environment
  variables and never from the wizard, Gemini, or export payload.
- Destination is fixed at generation. No argument or response may change origin/base path.
  Reject redirects, encoded traversal/separators, invalid inputs, oversized requests/responses;
  enforce timeouts, TLS validation and sanitized errors. Never retry requests automatically.
- Notes are documentation, not authority. Gemini sees only bounded notes, not the specification
  or credentials. Strict structured output is editable and explicitly approved for export.
  Failure retains original notes and does not block generation. Do not enter secrets in notes.
- Original notes and approved important notes are reviewable. Approved notes are an MCP resource.
- README explains every input schema, authentication, errors, and backend stdio integration.
  Browser-only apps require a backend. Hosted endpoints, OAuth, streaming/uploads and tenancy defer.

## Acceptance
Generate from examples/orders.openapi.json with a note, extract the package, launch the supplied
client, list tools/resources, and successfully create/read an order with explicit mutation selection.
Reject invalid arguments before dispatch. Test destination/path escapes, redirects, response limits,
timeouts, credential redaction, collisions, unsupported operations and note-processing fallback.

## Architecture and authority
Generation makes no target requests. Exported developer servers execute independently of GhostQA
runs and cannot change historical evidence, budgets or findings. Reset, baseline and invariant
requirements apply to fuzzing trials only, not conversion or standalone MCP calls. No hosted MCP
service, new backend, arbitrary model-generated code, or agent framework is added.

Input adapter retains the optional `requestBodyRequired` flag in imported ApiOperation snapshots.
This is backward compatible; fuzzing execution behavior is unchanged. MCP uses the flag to preserve
optional body semantics. Older saved snapshots lacking it default to requiring a body until reimported.
