# Gate 1 — Safe execution ready

Acceptance result: **PASSED**. Tasks T001–T030 complete; T031–T062 remain pending.

## Verification

On 2026-09-30, Node 24 and PostgreSQL 17, the complete Vitest run produced
**305 passed, 0 failed, 0 skipped** across 33 test files. All database tests used
isolated test schemas; networking used controlled loopback fixture/harness targets.

Commands (test database configuration supplied separately):

```sh
npm test -- --reporter=json --outputFile=/private/tmp/ghostqa-gate1-final.json
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Typecheck, full ESLint, Prettier verification and production build passed.
Generated `next-env.d.ts` is excluded from Prettier because Next rewrites it.
No executable tests were skipped. Earlier import-redaction failure was corrected,
with 25 focused tests passing before the complete suite passed.

## Dedicated acceptance review

| Property                                           | Implementation / executable evidence                                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Single target dispatch path                        | `RunSupervisor` → sole `BudgetManager` → trusted queue phase → frozen operation/scope policy → cancellation authorization → `dispatch.ts` → native HTTP executor; `single-dispatch.test.ts` and `dispatch.test.ts`                                     |
| Durable intent before dispatch                     | Atomic intent/counter persistence before socket; storage failure prevents dispatch; `dispatch.test.ts`, `journey-execution.test.ts`                                                                                                                    |
| Uncertain dispatch conservatively charged          | Intent remains charged through cancellation/unknown response; `dispatch.test.ts`, `supervisor.test.ts`                                                                                                                                                 |
| Interruption, ownership and shutdown               | Advisory lock exclusivity/loss, restart INTERRUPTED, no mutation replay, in-flight shutdown; `supervisor.test.ts`, `journey-execution.test.ts`                                                                                                         |
| Phase forgery cannot expand authority              | Strict input contracts; supervisor-owned queue phase, independent dispatcher policy; `core.test.ts`, `scope.test.ts`, `dispatch.test.ts`, `journey-execution.test.ts`                                                                                  |
| Control/excluded operations restricted             | Phase-aware operation categories deny unauthorized controls and excluded operations; `scope.test.ts`, `journey-execution.test.ts`                                                                                                                      |
| Shared budgets across trial phases                 | Complete trial admission before reset and one request counter; `budget.test.ts`, `fresh-state.test.ts`, `controlled-fixture-execution.test.ts`                                                                                                         |
| Cancellation prevents new dispatch                 | Rechecked after persistence; abort in-flight transport; no cleanup dispatch; `dispatch.test.ts`, `fresh-state.test.ts`, `transport.test.ts`                                                                                                            |
| URL/scope cannot expand silently                   | Canonical origin/port/base-path checks, operation-derived destinations, supplied URL values constrained as data; `scope.test.ts`, `variables.test.ts`, `dispatch.test.ts`                                                                              |
| Redirect escape prevented                          | Transport never follows Location; exactly one request; `transport.test.ts`                                                                                                                                                                             |
| Pinning and hostname/TLS identity                  | Frozen address lookup, remote address check, preserved Host/SNI and verified certificate, literal-IP mismatch rejected; `scope-preview.test.ts`, `scope.test.ts`, `transport.test.ts`                                                                  |
| Configured secrets excluded from ordinary evidence | AES-GCM nonce/AAD/tag/key tests; symbolic headers/URLs/bodies, echoes and trial tokens; persisted records and model-safe summaries checked; `secrets.test.ts`, `credentials.test.ts`, `evidence-store.test.ts`, `controlled-fixture-execution.test.ts` |
| OpenAPI supported profile                          | JSON/YAML × 3.0/3.1, duplicate keys, refs, recursion, ambiguity and unsupported behavior; OpenAPI contract tests                                                                                                                                       |
| Ref sibling semantics preserved                    | Original internal closure and Ajv combined semantics, stricter referenced constraints retained; `openapi-reference-siblings.test.ts`, `openapi-schema-semantics.test.ts`, `openapi-persistence.test.ts`                                                |
| Independent fresh state required                   | Frozen reset/check sequence and new verified baseline per trial, failed/partial/unevaluable setup blocks journey; 25 `fresh-state.test.ts` tests                                                                                                       |
| Missing cross-step values fail safely              | Explicit bindings, fresh extraction, dependency validation, substitution schema revalidation; `variables.test.ts`, `journey-execution.test.ts`                                                                                                         |
| Ambiguous mutations never automatically retry      | Single charged attempt after transport failure; `journey-execution.test.ts`, `transport.test.ts`, `supervisor.test.ts`                                                                                                                                 |
| Controlled fixture ready                           | Both faulty/repaired password-reset variants exercised with four dependent steps and independent fresh replay; `controlled-fixture-execution.test.ts`                                                                                                  |

Native target transport has one production importer (`src/server/dispatch.ts`),
and the sole production BudgetManager construction is in RunSupervisor.
Observation/evidence persistence extends the early durable dispatch repository;
it does not create another dispatch authority or budget owner.

## Files changed for T028–T030

- Journey validation/execution: `src/engine/validation/journey.ts`,
  `src/engine/execution/{journey,requests,auth,response-policy}.ts`.
- Authority/integration: `src/server/{run-supervisor,dispatch}.ts`.
- Evidence: `src/engine/observations/{store,summarize}.ts`,
  `src/server/repositories/{runs,journeys,evidence,specifications}.ts`.
- Acceptance fixes: `src/engine/policy/scope.ts`,
  `src/engine/execution/http-executor.ts`, `src/engine/secrets/vault.ts`,
  `src/engine/openapi/sanitize.ts`.
- New/expanded tests: journey execution, evidence store, controlled fixture execution,
  observations, scope preview/policy, transport, secrets and shared fresh-state helpers.
- Task checkpoint and this acceptance record; existing Gate 1 files received
  formatting-only cleanup. No later-gate implementation was started.

## Limits and next gate

Accepted architecture is unchanged. The approved preserved-schema OpenAPI
correction remains in effect; remote references remain prohibited.

Cancellation/transport abort cannot undo target-side mutations. Baseline assertions
verify declared state only; externally reported interference invalidates the trial.
Interrupted runs remain inspectable and do not automatically resume. JavaScript
cannot guarantee secure memory erasure, and unknown unmarked secret values cannot
be perfectly detected. Sensitive marker collisions fail closed.

Findings, reports, exports, Gemini provider calls and autonomous discovery are later
gate work. Current tests verify persisted execution/evidence and sanitized summary
boundaries; they do not claim completed finding/export/provider integrations.
The fixture execution tests use evaluator-authored deterministic journeys, not
model discovery, and do not mark findings CONFIRMED or artifacts VERIFIED.

T031 is the next dependency-ready task. Gate 1 permits beginning the planned Gate 2
implementation and subsequent controlled live Gemini fixture discovery once its
provider/planner tasks and explicit model configuration are ready. Gate 2 has not
begun and no live Gemini request was made during this acceptance pass.
