# Gate 1 parser compatibility blocker — resolved

Historical blocker evidence is retained below. The user approved the bounded schema/reference-closure correction on 2026-09-30. It is implemented and verified: the parser/OpenAPI group passes 60 tests; the full current Gate 1 suite passes 211 tests, with zero failures or skips. T017–T019 are complete. Gate 1 still has remaining tasks.

## Verified dispatch task

T016 and its prerequisite verification: 95 tests passed, zero failed, zero skipped. The source-boundary test additionally passed (one test). TypeScript checking passed. ESLint reported zero errors and one unused-import warning in `src/server/dispatch.ts`.

The verified path remains supervisor-owned budget and phase policy, persisted intent/accounting, final cancellation authorization, and the deterministic pinned HTTP executor. Cancellation during persistence prevents socket creation; uncertain intents remain conservatively charged; duplicate/concurrent authority is rejected.

## Invalidated assumption

The accepted research says to preserve OpenAPI 3.1 reference siblings while using Scalar and version-correct Ajv validation. The current dereferencing path assumes Scalar's flattened schema preserves those validation semantics.

With `@scalar/openapi-parser` 0.29.9 on Node 24.21.0, dereferencing this schema:

```json
{
  "$ref": "#/components/schemas/Name",
  "maxLength": 20
}
```

where `Name` is `{ "type": "string", "maxLength": 8 }`, produces:

```json
{ "maxLength": 20, "type": "string" }
```

OpenAPI 3.1 Schema Object references apply the target and adjacent keywords together. A nine-character string must fail the referenced eight-character limit. The current GhostQA model instead admits it.

Reference: [OpenAPI Initiative references overview](https://learn.openapis.org/referencing/overview.html).

Reproduction fixture: `tests/fixtures/openapi/reference-siblings-3.1.json`.

Failing regression: `tests/contract/openapi-reference-siblings.test.ts` (zero passed, one failed; `expected true to be false`).

## Other incomplete compatibility work

`tests/contract/openapi.test.ts`: nine passed, two failed. The current structural/reference diagnostic partition incorrectly treats Scalar's `INVALID_REFERENCE` and `SELF_REFERENCE` diagnostics as global document failures rather than the accepted affected-operation exclusions. These are implementation defects; they are not justification to change the support profile. T017's full compatibility matrix is still incomplete.

## Affected tasks and smallest proposed correction

T018 is blocked; T019's generation/runtime validation also depends on correct reference semantics. T017 must retain the failing regression and finish its compatibility matrix. Downstream Gate 1 tasks remain unchecked.

Keep the selected stack. Retain original OpenAPI 3.1 schemas and bounded internal-reference closures for Ajv rather than treating Scalar's flattened schema as equivalent. Ensure generation uses the same constraint semantics; report unsupported combinations explicitly instead of widening them. Continue using Scalar for parsing/structural validation. This proposed correction has not been applied.

T016 is complete. T017 and T018 are not complete. Gate 1 has not passed. No Gate 2 work has begun.

## Resolution

Scalar dereferencing no longer supplies authoritative request/response schemas. Original constraints
and internal-reference closures are preserved for Ajv. The original failing sibling regression
passes permanently. Both diagnostic-partition defects are fixed. Remote/file references remain
blocked, recursive generation remains excluded, and unsupported/ambiguous schemas fail closed.
Schema-aware snapshot sanitization preserves credential field definitions without persisting
secret data annotations. No stack or execution-authority redesign occurred.

## Files changed in the approved correction batch

- Engine: `src/engine/openapi/document.ts`, `import-worker.ts`, `model.ts`, `parse.ts`,
  `profile.ts`, `references.ts`, `sanitize.ts`, `schemas.ts`.
- Server: `src/server/repositories/specifications.ts`, `src/server/run-supervisor.ts`.
- Tests: `tests/contract/openapi-schema-semantics.test.ts`,
  `tests/contract/openapi-profile-matrix.test.ts`,
  `tests/integration/openapi-persistence.test.ts`,
  `tests/unit/openapi-sanitization.test.ts`, `tests/unit/openapi-worker.test.ts`.
- Notes: `specs/001-ghostqa-mvp/research.md`, `plan.md`, `contracts/core-types.md`,
  `tasks.md`, and this report.

The original `tests/contract/openapi-reference-siblings.test.ts` and its fixture are retained
unchanged as permanent regression evidence. Typecheck and changed-file formatting pass. ESLint
has zero errors and one pre-existing unused-import warning in the dispatcher. No new dependency,
constitution change, later-gate work, or broad UI work is included.
