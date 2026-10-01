# T048 — Series 2 failure analysis

Both frozen series remain FAIL. T048 stays unchecked. No new benchmark or live model call was executed.

## Evidence and diagnosis

Series 2 has 16 HTTP 429 RESOURCE_EXHAUSTED failures, four contract rejections, three stagnation stops, one repaired execution error and six complete confirmed reproduction pipelines. The first 429 occurred at global model call 17. Trials and calls were sequential; no provider quota or violated pacing rule is established. No retries or discovery-policy changes are justified.

Workflow faulty ordinals 21–25 and repaired 26–30 failed on their first provider calls, before usable proposals, fresh baselines or target dispatch. There is no evidence to evaluate workflow journey quality or public-contract discoverability. Inventory faulty ordinals 11–13 also failed before usable proposals; successful ordinals 14–15 produced dependent three-step journeys and CONFIRMED/VERIFIED results.

Order-lifecycle faulty ordinal 1 and repaired ordinals 7, 9 and inventory repaired 16 failed contract validation. Retained journals establish CONTRACT_VALIDATION but not the violated rule or rejected output shape. Do not attribute these failures to a particular rule retroactively. The diagnostics-only fix retains bounded fixed rule codes and safe schema issue paths for future failures; it does not retain raw proposals or weaken validation.

Repaired stagnation ordinals 8, 17 and 18 stopped after three repeated normalized proposals. Production hypothesisHash was recomputed offline against all retained accepted proposals. Prior independently fresh journeys evaluated SATISFIED. Feedback observations, mappings and considered hashes were retained in subsequent contexts. No faulty stagnation occurred. Alternative public operations remained available, but repeated proposals supplied no new normalized journey. No general discovery defect is established.

Repaired ordinal 6 dispatched reset, baseline and creation, then failed on a request-body /id binding where the identifier was in the response. No subsequent dispatch or predicate verdict was manufactured. This is fail-closed missing-runtime-value behavior, not an established execution defect.

AP-002 remains FAIL because inventory and workflow miss their individual 4/5 discovery and confirmation thresholds. Repaired confirmations are zero. Provider capacity is the immediate blocker for every failed faulty inventory/workflow trial.

## Complete Series-2 matrix

Trial IDs, per-round provider diagnostics, proposal operations/dependencies, safe feedback counts, normalized novelty hashes, predicate outcomes and exact evidence references are in [the machine-readable analysis](t048-series2-analysis.json). “J” means admitted exploration journeys; “eval” counts completed exploration predicate evaluations. Unknown rejected rules remain UNKNOWN.

| #   | Fixture         | Variant  | Discovery / confirmation       | Terminal reason       | Calls | 429 | J / eval | Requests | Immediate cause                           |
| --- | --------------- | -------- | ------------------------------ | --------------------- | ----: | --: | -------: | -------: | ----------------------------------------- |
| 1   | order-lifecycle | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL PLAN ERROR      |     1 |   0 |    0 / 0 |        0 | C CONTRACT VALIDATION; EXACT RULE UNKNOWN |
| 2   | order-lifecycle | faulty   | OBSERVED VIOLATION / CONFIRMED | REPRODUCTION COMPLETE |     1 |   0 |    1 / 1 |       15 | SUCCESS                                   |
| 3   | order-lifecycle | faulty   | OBSERVED VIOLATION / CONFIRMED | REPRODUCTION COMPLETE |     1 |   0 |    1 / 1 |       15 | SUCCESS                                   |
| 4   | order-lifecycle | faulty   | OBSERVED VIOLATION / CONFIRMED | REPRODUCTION COMPLETE |     1 |   0 |    1 / 1 |       15 | SUCCESS                                   |
| 5   | order-lifecycle | faulty   | OBSERVED VIOLATION / CONFIRMED | REPRODUCTION COMPLETE |     1 |   0 |    1 / 1 |       15 | SUCCESS                                   |
| 6   | order-lifecycle | repaired | NOT OBSERVED / NOT ATTEMPTED   | EXECUTION ERROR       |     1 |   0 |    1 / 0 |        3 | F EXECUTION ERROR                         |
| 7   | order-lifecycle | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL PLAN ERROR      |     2 |   0 |    1 / 1 |        5 | C CONTRACT VALIDATION; EXACT RULE UNKNOWN |
| 8   | order-lifecycle | repaired | NOT OBSERVED / NOT ATTEMPTED   | STAGNATION            |     5 |   0 |    2 / 2 |       10 | D STAGNATION AFTER VALID PROPOSALS        |
| 9   | order-lifecycle | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL PLAN ERROR      |     1 |   0 |    0 / 0 |        0 | C CONTRACT VALIDATION; EXACT RULE UNKNOWN |
| 10  | order-lifecycle | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     3 |   1 |    2 / 2 |       10 | A PROVIDER 429                            |
| 11  | inventory       | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 12  | inventory       | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 13  | inventory       | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 14  | inventory       | faulty   | OBSERVED VIOLATION / CONFIRMED | REPRODUCTION COMPLETE |     1 |   0 |    1 / 1 |       15 | SUCCESS                                   |
| 15  | inventory       | faulty   | OBSERVED VIOLATION / CONFIRMED | REPRODUCTION COMPLETE |     1 |   0 |    1 / 1 |       15 | SUCCESS                                   |
| 16  | inventory       | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL PLAN ERROR      |     1 |   0 |    0 / 0 |        0 | C CONTRACT VALIDATION; EXACT RULE UNKNOWN |
| 17  | inventory       | repaired | NOT OBSERVED / NOT ATTEMPTED   | STAGNATION            |     4 |   0 |    1 / 1 |        5 | D STAGNATION AFTER VALID PROPOSALS        |
| 18  | inventory       | repaired | NOT OBSERVED / NOT ATTEMPTED   | STAGNATION            |     5 |   0 |    2 / 2 |       10 | D STAGNATION AFTER VALID PROPOSALS        |
| 19  | inventory       | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     5 |   1 |    2 / 2 |       10 | A PROVIDER 429                            |
| 20  | inventory       | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 21  | workflow        | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 22  | workflow        | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 23  | workflow        | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 24  | workflow        | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 25  | workflow        | faulty   | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 26  | workflow        | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 27  | workflow        | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 28  | workflow        | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 29  | workflow        | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |
| 30  | workflow        | repaired | NOT OBSERVED / NOT ATTEMPTED   | MODEL ERROR           |     1 |   1 |    0 / 0 |        0 | A PROVIDER 429                            |

## Series comparison

Each row retains a denominator of five, including all errors. Counts are observed outcomes, not inferred provider quotas.

| Series | Fixture         | Variant  | 429 | Contract | Stagnation | Admitted / completed journeys | Discoveries / confirmations | Model calls | Requests |
| ------ | --------------- | -------- | --: | -------: | ---------: | ----------------------------: | --------------------------: | ----------: | -------: |
| 1      | order-lifecycle | faulty   |   0 |        0 |          0 |                         5 / 5 |                       5 / 5 |           5 |       75 |
| 1      | order-lifecycle | repaired |   1 |        3 |          1 |                         4 / 4 |                       0 / 0 |          12 |       20 |
| 1      | inventory       | faulty   |   1 |        1 |          0 |                         3 / 3 |                       3 / 3 |           5 |       45 |
| 1      | inventory       | repaired |   2 |        1 |          2 |                         5 / 5 |                       0 / 0 |          14 |       25 |
| 1      | workflow        | faulty   |   5 |        0 |          0 |                         0 / 0 |                       0 / 0 |           5 |        0 |
| 1      | workflow        | repaired |   5 |        0 |          0 |                         0 / 0 |                       0 / 0 |           5 |        0 |
| 2      | order-lifecycle | faulty   |   0 |        1 |          0 |                         4 / 4 |                       4 / 4 |           5 |       60 |
| 2      | order-lifecycle | repaired |   1 |        2 |          1 |                         6 / 5 |                       0 / 0 |          12 |       28 |
| 2      | inventory       | faulty   |   3 |        0 |          0 |                         2 / 2 |                       2 / 2 |           5 |       30 |
| 2      | inventory       | repaired |   2 |        1 |          2 |                         5 / 5 |                       0 / 0 |          16 |       25 |
| 2      | workflow        | faulty   |   5 |        0 |          0 |                         0 / 0 |                       0 / 0 |           5 |        0 |
| 2      | workflow        | repaired |   5 |        0 |          0 |                         0 / 0 |                       0 / 0 |           5 |        0 |

## Corrections and validation

Changed production file: `src/engine/planning/provider.ts` (diagnostic telemetry only). Added five regression tests in `tests/contract/provider-failure-diagnostics.test.ts`: semantic operation rejection, predicate-reference rejection, safe Zod schema issues, missing predicate evidence role and bounded output-size rejection. They failed before implementation; all provider/planner focused checks now pass (78/78).

Typecheck and changed-file lint pass. No authority, dispatcher, budget, freshness, predicate, planner prompt, fixture, retry or threshold semantics changed. A new frozen build/configuration identity is required for a future measured series.

## Historical integrity and remaining limits

SHA-256 comparisons cover 245 retained files across both series plus historical benchmark.json/results.md. All bytes match the pre-analysis snapshot. The full hash manifest is retained in the analysis JSON. Historical counts, journals, frozen identities and acceptance conclusions were not edited.

No Series 3 was executed. Provider capacity remains unresolved; historical rejected-rule details cannot be recovered. A future series is not yet justified solely by this diagnostics correction. T048 remains unchecked; T049 and optional T058 are untouched.

## Final validation

- Focused benchmark/provider/planner/agent-loop/authority/secret/sanitization checks: 180 passed, 0 failed, 0 skipped.
- Full regression: 871 passed, 0 failed, 0 skipped (prior baseline 866 plus five diagnostic regressions).
- `npm run typecheck`: PASS.
- Changed TypeScript files ESLint: PASS. Changed TypeScript/checkpoint Markdown/JSON Prettier: PASS.
- Configured protected-value scan of the four changed/new files: PASS. Existing secret/redaction and standalone authority regressions: PASS. This is not a claim of perfect detection of arbitrary unmarked data.
- Both retained series: 30 assignment/result records consistent with their summaries; 245 historical file hashes unchanged.
- Known unrelated repository-wide issues remain: 2 lint errors and 9 formatting failures. No broad cleanup performed.

No supervisor/dispatch, budget, scope, fresh-state, deterministic predicate or fixture semantics changed. The only production change is validation diagnostic telemetry; historical failures cannot be retroactively assigned its new rule codes. T048/T049/T058 task definitions and checkbox states were not edited.
