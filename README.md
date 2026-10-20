# GhostQA

GhostQA converts OpenAPI contracts and developer notes into downloadable local MCP servers. The existing workflow-fuzzing engine remains available separately.

## Generate an MCP server

Use Node 24. Run `npm install` and `npm run dev:mcp`, then open http://127.0.0.1:3000/mcp.
Direct conversion does not require a database or Gemini; configure `GEMINI_API_KEY` and `GEMINI_MODEL`
in `.env.local` to process notes. Saved projects require the full application (`npm run dev` below).

1. Upload JSON/YAML or paste your OpenAPI contract. Inspect endpoints; supported GET tools start selected.
2. Enter the API base URL and select each mutation explicitly. Choose no auth, bearer or an API-key header.
3. Enter notes without secrets, process them with Gemini or use the originals, edit important notes, and approve documentation.
4. Download `api-mcp-server.tar.gz`, extract it, run `npm install`, copy `.env.example` to `.env`, and privately configure credentials if needed.
5. Run `npm run client` in the extracted directory to list tools and read important notes. Use `npm run client -- TOOL_NAME 'JSON_ARGUMENTS'` to call a tool.

For Orders, run `npm run example` in another terminal and upload `examples/orders.openapi.json`.
Use base URL `http://127.0.0.1:4010` (the paths already contain `/api`). Select `POST /api/orders`,
call it with `{}`, then call the generated GET order tool with `{"path":{"orderId":"RETURNED_ID"}}`.

The package includes SDK-based stdio server source, deterministic runtime, manifest, environment
placeholders, README, client example and backend configuration. A browser-only app needs a backend
to launch the server. Notes cannot change executable code, schemas, tools or credentials. Gemini
failure retains original notes and permits generation. API-key auth is header-based; OAuth,
streaming, multipart uploads and hosted MCP URLs are outside this MVP. Header parameters are
excluded. JSON bodies follow OpenAPI required declarations; older saved contracts without this
metadata require a body until reimported.
Destination origin and base path are fixed; redirects are rejected. Inputs and responses are limited
to 1 MiB; requests time out at 10 seconds. Check API state before retrying an ambiguous mutation.
See [feature scope](specs/002-openapi-mcp/spec.md) and [verification](docs/mcp-validation.md).

## Existing workflow-fuzzing engine

## Start locally

Use Node 24 and PostgreSQL. Copy `.env.example` to `.env.local` and configure `DATABASE_URL`, `GEMINI_API_KEY`, an available `GEMINI_MODEL`, and a 64-character hexadecimal `GHOSTQA_CREDENTIAL_KEY`. Preserve that encryption key to reopen saved credentials.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Startup applies versioned database migrations. For production, use `npm run build` followed by `npm start`.

### Neon PostgreSQL

The repository includes a Postgres-only `neon.ts` policy. Link the intended project
and branch with the Neon CLI, then run `neon config plan` and `neon deploy` to
review the policy and pull connection variables into the ignored `.env.local`.
Keep the existing Gemini configuration and credential encryption key private.

GhostQA retains the `pg` driver. When `DATABASE_URL_UNPOOLED` is present, both the
application and `npm run db:migrate` use it in preference to `DATABASE_URL`:
supervisor advisory locks and migrations require a dedicated Postgres session,
which transaction pooling cannot provide. Use `sslmode=verify-full` in the Neon
connection strings to verify the server certificate and hostname. Neon CLI env
pulls may restore their default TLS query settings; check them after pulling.

On the verified local macOS network, Node's address-family auto-selection timed
out. These commands succeeded without changing target-execution policy or TLS:

```sh
NODE_OPTIONS=--no-network-family-autoselection npm run db:migrate
npm run build
NODE_OPTIONS=--no-network-family-autoselection npm start
```

This connects the local application to Neon; `neon deploy` does not publish the
Next.js website.

### Render Free: private single-owner deployment

Use the existing Node Web Service with build command `npm ci && npm run build`,
start command `npm start`, and the **Free** instance. `render.yaml` records the
same settings for a future Blueprint deployment; do not create a second service.
Set `NODE_VERSION=24.21.0` and health-check path `/healthz`.

Copy the Neon connection variables, Gemini configuration, and existing
`GHOSTQA_CREDENTIAL_KEY` into Render's private Environment settings. Set
`GHOSTQA_ADMIN_PASSWORD` to a unique 32–256-character password there. Do not commit
these values. The browser login username is `ghostqa`. Render supplies
`RENDER_EXTERNAL_URL`; for another host set `GHOSTQA_PUBLIC_ORIGIN` to its exact
HTTPS origin. The server uses the assigned `PORT` and refuses to start in hosted
mode without valid operator credentials. Always start via `npm start`, which
installs the authentication gate before serving Next.js.

Hosted pages, APIs, exports, and assets require authentication. The sole public
health endpoint returns fixed process-readiness information. Origin/CSRF checks
remain enabled. This is a private developer instance, not a multi-user service.
Hosted fuzzing reaches targets from Render's network; `localhost` means that
server, not your laptop.

Render Free sleeps when idle and local files do not survive redeploys. Project
configuration and engine evidence are stored in Neon; transient demo presentation
files may disappear. Download demo artifacts you want to retain. No paid disk or
additional service is required.

## First workflow

Follow [the example walkthrough](examples/README.md). The downloadable [OpenAPI specification](examples/orders.openapi.json) is paired with a disposable local API started by `npm run example`.

For your own API, use the six-step guided setup. It resumes from saved project state; **Show all settings** opens the complete configuration view. Authentication is optional, and unsaved edits must be saved before reviewing execution.

1. Choose **Import OpenAPI**, upload/paste supported OpenAPI 3.0/3.1 JSON or YAML, validate, name it, and save the project.
2. Save its actual target base URL, execution limits, and excluded operations.
3. Save bearer/API-key credentials in encrypted slots when needed. Credentials are never included in exports; supply them separately to the exported runner.
4. Configure reset requests, reset assertions, baseline inspection requests, and baseline assertions. Use advanced JSON for bodies, parameters, bindings, or multiple checks. Each reproducibility trial must verify fresh state.
5. Save a machine-checkable business invariant with named evidence roles. Review and explicitly approve the saved version. Editing creates a new unapproved predicate.
6. Preview the resolved addresses and phase-specific operation policy. Acknowledge mutations and approve execution. Configuration changes or expiry require a new preview.
7. Inspect live counters, rationale, sanitized request/response evidence, finding classification, and confirmation. Cancel prevents new target dispatch; it cannot undo completed mutations.
8. Download available Markdown/JSON reports and the regression runner. Projects and custom-run evidence persist in PostgreSQL; reopen them from **Projects**.

## Demos and errors

**Try a demo API** starts a bundled disposable target and uses the configured Gemini provider. Model output is untrusted: invalid UUIDs, operations, bindings, or structured output are rejected before execution. Run errors distinguish provider rejection, quota, timeout, malformed output, and invalid workflow. Each offers recovery guidance; sanitized planning diagnostics show the validation stage, rule, and field where available. Provider availability/quota can also stop a run. A failed planning run is not a confirmed product bug, and no confirmed violation does not establish correctness.

Current implementation provides local single-user setup and execution. The required engine benchmark acceptance gate remains separate from successful example/demo runs.

## Verification

```sh
npm run typecheck
npm run build
TEST_DATABASE_URL=postgresql://... npm test
```

Database tests create isolated schemas; use a dedicated test database with schema privileges.
