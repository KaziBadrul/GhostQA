# OpenAPI → MCP verification

Feature scope: `specs/002-openapi-mcp/spec.md`. Existing fuzzing authority remains governed by
Feature 001; the standalone export runtime is explicitly separate from a GhostQA run.

## Observed acceptance

- Desktop browser at `/mcp`: imported the Orders contract, inspected six supported operations,
  observed GET-only initial selection, explicitly selected order creation, entered a note,
  processed it successfully with the configured Gemini model, reviewed/approved it and downloaded
  the archive. No reset, baseline or invariant setup was needed for conversion.
- Extracted the browser-downloaded package outside the repository, installed its own dependencies
  with `npm install --ignore-scripts --no-audit --no-fund`, and launched its supplied Node client.
  It discovered three tools, read important notes, created an order and fetched the created order
  against an independently started disposable Orders API. The fixture was closed afterwards.
- The automated package integration extracts the actual tar.gz, launches a real SDK stdio client,
  lists tools, reads the notes resource, creates/reads an order and rejects an invalid UUID.
- Unit/contract/package regression suite: **588 tests passed across 44 files** using
  `npm test -- tests/unit tests/contract tests/integration/mcp-package.test.ts`.
- The final feature-only checks passed all **18 tests across 3 files** after moving runtime compilation to build time.
- Production `npm run build` passed, including TypeScript validation and both MCP routes.
- ESLint passed for all changed feature/importer/test files. Repository-wide `npm run lint`
  remains unsuccessful because of two pre-existing `any` errors in `src/engine/mapping/state.ts`
  and many warnings in generated acceptance artifacts. They were not suppressed or refactored.

## Verified boundaries

Tests cover schema validation without coercion, additional argument rejection, path traversal and
encoded separator rejection, fixed origin/base path, redirects, response limits, request timeout,
pre-dispatch and in-flight cancellation, no retries, unknown tool names, bearer credential redaction,
withholding raw HTTP error bodies, known configured secrets in documentation, local same-origin
CSRF protection, unsupported import operations, duplicate YAML keys, deterministic tool naming,
reference relocation, OpenAPI required/optional JSON bodies, saved specification reuse, and
strict structured notes with provider/malformed-output fallback. Existing engine single-dispatch
checks still reject standalone runtime imports into engine, CLI and run-authority server modules.

## Corrections discovered through verification

- Nested tool schemas must relocate the importer's independent local reference closures. Reference
  targets are preserved in private schema definitions, without importing descriptions/examples.
- Next.js Turbopack merges worker metadata into object payloads. The importer now uses `{ text }`
  instead of a primitive string; parsing limits and validation remain unchanged.
- Imported snapshots retain optional `requestBodyRequired` metadata. Historical snapshots still
  parse without it; reimport those snapshots to preserve optional-body declarations.
- Standalone runtime compilation occurs in `build:engine`; generation needs no compiler at runtime.

## Practical limits

This is local stdio, not a hosted URL. API-key authentication uses a dedicated header. Header
parameters, non-JSON media, streaming/uploads and importer-unsupported schema constructs are
reported as unsupported. Responses are bounded JSON but are not asserted against response schemas.
Destination DNS is resolved by Node; the package is for trusted developer-configured hosts/networks.
Raw credentials are never accepted in conversion configuration. Notes must not contain secrets;
known configured secrets are withheld/rejected, but arbitrary unmarked secrets cannot be detected
perfectly. Failed mutations may have applied and are never retried automatically.

Direct conversion uses `npm run dev:mcp`; database-backed saved projects use `npm run dev`.
Desktop labelled controls and download behavior were checked in the native browser.
Responsive CSS uses the existing mobile shell and single-column fields at narrow widths; a separate
phone viewport interaction check could not be completed after browser control lost its active
window during unrelated user activity. No full product-acceptance gate is claimed by this feature.
