# Phase 0 research and decisions

Research date: 2026-09-30. Dependency patch versions are pinned in the implementation lockfile
following compatibility checks; these design decisions are not claims that dependencies were installed.

## Runtime and application

Decision: Node 24 LTS, Next.js App Router 16, TypeScript 5, Tailwind 4, Zod 4; one self-hosted
Node process serving the UI plus a supervised framework-independent engine worker thread.
Rationale: long runs, native sockets, deadlines, and cancellation require process ownership; a
single thread isolates synchronous parsing from UI cancellation. A custom server owns lifecycle,
not an unawaited promise in a route handler. Framework-independent engine imports no Next modules.
Alternatives: FastAPI adds an unnecessary language/service; serverless functions cannot own ten-
minute local-target runs reliably; Redis/queues are not required for one active run. Custom server
forgoes some Next optimizations and standalone output; use its documented deployment path.
Sources: [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting),
[custom server](https://nextjs.org/docs/app/guides/custom-server),
[Node release policy](https://nodejs.org/en/about/previous-releases),
[Tailwind Next integration](https://tailwindcss.com/docs/installation/framework-guides/nextjs),
[Zod](https://zod.dev/).

## OpenAPI/YAML and input schema validation

Decision: @scalar/openapi-parser, yaml 2, Ajv 8 plus ajv-formats for the allowed email/uuid formats.
Scalar explicitly supports 3.0/3.1 and opt-in loading plugins. Use in-memory objects, no file/URL
load plugins, no upgrade or repair operations. yaml performs actual YAML parsing; GhostQA adds
resource limits, eligibility classification and reference graph inspection, not a custom parser.
Parse one document with duplicate keys rejected, custom tags/merge disabled, bounded aliases.
Validate full structural OpenAPI truth, then classify operation-local missing/external/cyclic
references without discarding unaffected operations. Build per-operation internal-reference
closures for schema validation; only eligible acyclic closures proceed to dereferencing. Preserve
3.1 reference siblings. A bounded preflight graph is not permission to fetch external references.
Ajv 2020 instance validates 3.1 schemas; separate draft-07-compatible instance validates the
supported 3.0 subset after explicit nullable normalization. Preserve the original document and
record normalized-schema provenance; never feed raw OAS 3.0 schemas blindly into Ajv. Disable remote
schema loading; compile only profile-approved schemas. Unsupported keywords block generation.
Formats/patterns are not silently ignored: arbitrary patterns and unknown formats are excluded.
Alternatives: Swagger Parser documentation has weaker 3.1 guarantees; Redocly is a mature fallback
but broader CLI/configuration machinery. Neither fallback may silently change the accepted profile.
Sources: [Scalar README](https://github.com/scalar/scalar/blob/main/packages/openapi-parser/README.md),
[YAML](https://eemeli.org/yaml/), [Swagger options](https://apidevtools.com/swagger-parser/options.html),
[Redocly](https://redocly.com/docs/cli/v1/guides/migrate-from-swagger-cli),
[Ajv schema versions](https://ajv.js.org/json-schema.html),
[Ajv formats](https://ajv.js.org/guide/formats.html).
Accepted implementation correction (2026-09-30): Scalar flattening is not authoritative for
request/response Schema Objects. Keep the selected schema and its bounded internal reference
closure, retaining original JSON Pointer relationships. Ajv evaluates this representation with
version-correct semantics; OpenAPI 3.1 `$ref` siblings apply together, never overwrite referenced
constraints. Scalar remains the structural validator with no loading plugins. Recursive generation
schemas remain excluded under the accepted profile. Unsupported/ambiguous closures fail closed;
no custom JSON Schema evaluator or remote resolution is introduced. OpenAPI Reference Objects
outside schemas may be resolved for extraction without flattening Schema Objects. Schema-aware
sanitization preserves field definitions and redacts data annotations; secret-bearing semantic
constraints cause explicit operation exclusion rather than changed execution authority.

Implementation gate: intercept network/filesystem attempts and run mixed valid/excluded 3.0/3.1
fixtures against the exact locked parser release. Confirm structured validation diagnostics can
separate document errors from operation-local exclusions. Fail closed if they cannot; do not
claim compatibility until the matrix passes.

## Target HTTP

Decision: node:http/node:https with custom lookup returning one frozen approved address, original
hostname/Host, DNS-name SNI, default certificate checks and rejectUnauthorized true. IP literals
must have valid IP certificates for HTTPS. agent:false, no proxies, redirects, retries or address
fallback. Check normalized socket remote address before writing application payload. Pin the
selected approved address for the run, while retaining the complete reviewed address set.
Absolute AbortSignal/deadline destroys request and response; timeout events alone are insufficient.
Cap outbound encoded body at 1 MiB, combined outbound headers at 16 KiB, inbound headers at 16 KiB,
response at spec's 1 MiB. Request identity encoding; unexpected compression is unsupported and
stops execution. Never use global fetch for target requests. Provider network is separate fixed-
origin adapter traffic and is not counted as target requests; it obeys model/run deadlines.
Alternatives: Undici permits custom dispatch but has more connector/redirect behavior to audit;
Axios/fetch conveniences risk implicit redirects or DNS re-resolution. Native HTTP minimizes
hidden behavior while requiring explicit tested stream handling.
Sources: [Node HTTP](https://nodejs.org/api/http.html), [Node HTTPS](https://nodejs.org/api/https.html).

## Gemini

Decision: official @google/genai behind ReasoningProvider. Configurable gemini-3.5-flash-lite is
the initial low-cost candidate according to current model/pricing docs; verify account eligibility
before live benchmark. No model migration during a benchmark. Structured JSON schema output,
then strict Zod and deterministic operation/schema/policy validation; tools/function calling are
omitted. Explicit retries attempts:1, 30-second timeout capped by run deadline, AbortSignal, bounded
output. Non-JSON/refusal is MODEL PLAN ERROR; transport/availability/429 is MODEL ERROR. Record
usage metadata or the specified byte-based estimate. Avoid a general agent framework.
Alternatives: direct REST reduces SDK surface but adds provider serialization/usage parsing;
older 2.5 models have availability restrictions and are not a safe assumed free-tier default.
Sources: [models](https://ai.google.dev/gemini-api/docs/models),
[pricing](https://ai.google.dev/gemini-api/docs/pricing),
[structured output](https://ai.google.dev/gemini-api/docs/structured-output),
[SDK timeout/abort](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html),
[HTTP options](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpOptions.html).
Client abort does not guarantee provider computation/cost cancellation. Free quota is not a
benchmark throughput guarantee. Raw secrets are never an acceptable provider fallback.

## Persistence, secrets, artifacts, and testing

Decision: PostgreSQL 17 or newer with pg (node-postgres), parameterized SQL, numbered SQL migrations,
JSONB for immutable structured evidence. No ORM or Supabase auth/client is needed. Supabase-hosted
PostgreSQL is an optional database URL, not a tenancy/auth architecture. Keep default local DB.
Use node:crypto AES-256-GCM with fresh 96-bit nonce, per-record AAD binding project/credential/version,
separate 32-byte environment/file key, ciphertext/tag/key ID only in DB. OS file permission 0600
for a file key, not repository/.env committed content. Missing/incorrect key fails closed.
Decision: export JSON manifest plus a bundled offline Node .mjs runner generated from a fixed
versioned engine build (esbuild), not model-written source. The bundle needs Node only, no model,
Next or DB. During an originating run, verification interprets the exact immutable exported
manifest through the existing engine and supervisor-owned dispatcher; it does not load a second
network-capable runner/worker. The independent bundle is tested separately, without authority to
change original run records or grant VERIFIED. No shell execution is introduced.
Decision: supervisor process owns the sole BudgetManager, final dispatch gate and native executor;
engine worker submits structured intents. Rejected alternative: second artifact worker or copied
budget creates cancellation/accounting races. Cancellation, advisory-lock loss and shutdown close
one gate, rechecked after awaited persistence before dispatch. Vitest for contract/unit/integration tests;
manual keyboard/mobile acceptance for UI, no visual-testing infrastructure.
Alternatives: Prisma adds generation/mapping overhead; plaintext credentials violate spec;
standalone cURL cannot enforce all scope/predicate/reset rules; custom model-generated scripts
violate authority boundaries. Sources: [pg queries](https://node-postgres.com/features/queries),
[JSONB](https://www.postgresql.org/docs/current/datatype-json.html),
[crypto](https://nodejs.org/api/crypto.html), [esbuild](https://esbuild.github.io/api/),
[Vitest](https://vitest.dev/guide/).

## Remaining technical risks (decisions resolved, proofs pending)

Parser diagnostic partitioning, native socket/SNI/address behavior, 3.0 nullable normalization,
worker cancellation/persistence races, bundle verification without secret persistence, and Gemini
fixture discovery rate require early implementation tests. These are measurable proof gates, not
unresolved technology selections. Gate failure requires explicit revision, never weakened spec.
