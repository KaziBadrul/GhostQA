# T048 — Gate 5 engine acceptance: FAIL

**T048 remains unchecked.** One frozen series was executed with actual configured
Gemini; all **30/30 assignments** were attempted and retained. Inventory achieved
3/5 discoveries and confirmations, and workflow 0/5; each requires at least 4/5.
No behavior changed, no assignment was retried by the harness, and no second
series was started. T049+ and optional T058 remain untouched.

## Frozen series and pre-flight

Series: `gate5-0964afd0-7aa7-4a71-a063-ce7042585538`. Classification: **Codex-executed live configured Gemini
required benchmark**, distinct from supplied-journey and prior developer evidence.
Provider/model: `gemini` / `gemini-3.5-flash-lite`. Node v24.21.0,
darwin / arm64.

Read-only pre-flight verified checked T046/T047, the exact order-lifecycle,
inventory, workflow suite, 30 assignments with unique run identities, neutral
contracts/private-data exclusion, phase-filtered planning context, fresh supervised
lifecycle, failed denominators, no supplemental dependency and available supervisor
ownership. Harness/fixtures/artifact/sole-dispatch tests passed **61/61**, including
22 harness and 22 artifact-acceptance tests. The sandbox-only initial attempt was
blocked by local socket permissions; its approved rerun passed before any live
trial. Retained T047 manifests, all 36 clean trial references, three bundle hashes,
originating before/after hashes and configured-value scan were statically revalidated.

`gate5-0964afd0-7aa7-4a71-a063-ce7042585538/identity.json` and `preflight.json` recorded identity and frozen
hashes before trial 1. Native `series.json` recorded all assignments before execution.
Every assignment/result has its own immutable journal file; snapshots/exports are
in numbered directories. Source/build identities were checked before every
assignment and after the last; **frozenIdentityUnchanged = true**. The pre-flight
freeze and measured freeze match exactly.

- engineHash: `2cbcfd05a09be0d296f3ca47b0b096212fea3b0212a297aaf9a9cdd55bb0ed21`.
- buildHash: `b9aecf93eff8d9d3ecc3abb1a1b91df1244bb5aaf692566ed166e49549c18d21`.
- promptHash: `2811526c6f7e88de2fd604c5561e5e6c39de8248a64b3ba154f1ed2b7e5409d7`.
- dependencyHash: `f77a13c73abbc0c67348574a8675c64961de8613ba6b1b2d21a1f78d676d20ff`.
- modelHash: `5a838f92caeff18f264cd53b55047d80a356c59e9c31f66a99e89f515b24dca4`.
- fixtureHash: `ec5f5b9118c4647da82ce9e51c4fe3e09fa04a601fd1f0958ea46923eae102dc`.
- configurationHash: `1d4b7a1cdc5f10ba25e14e1335dc6a260e1f43f8b69826a36afab5b1a06e25f7`.

Limits per independent originating run: 200 requests, 600000 ms, 20 exploration
journeys, 10 steps, 10000 ms request timeout, 30000 ms model timeout. No credentials
are required by these synthetic fixtures. Existing bounded planning and stagnation
semantics remain unchanged; a run may make multiple proposal rounds. There were
46 actual model calls across 30 assignments, not 30 invisible retry attempts.

## Required SC-002 / AP-002 measurements

| Fixture         | Variant  | Discoveries | Confirmations | Required outcome |
| --------------- | -------- | ----------- | ------------- | ---------------- |
| order-lifecycle | faulty   | 5/5         | 5/5           | PASS             |
| order-lifecycle | repaired | 0/5         | 0/5           | PASS             |
| inventory       | faulty   | 3/5         | 3/5           | FAIL             |
| inventory       | repaired | 0/5         | 0/5           | PASS             |
| workflow        | faulty   | 0/5         | 0/5           | FAIL             |
| workflow        | repaired | 0/5         | 0/5           | PASS             |

All rates use five assigned trials. Failed/error trials remain in the denominator;
no pooled rate conceals a fixture-specific failure. Repaired confirmations are
0/5 for every fixture, but provider/validation failures on repaired assignments
are not proof of repaired assertion execution. They are unsuccessful measured
trials; controlled repaired behavior is separately established by T045/T047.

Terminal results: eight REPRODUCTION COMPLETE, fourteen MODEL ERROR, five MODEL
PLAN ERROR, three STAGNATION. No cancellation, interruption, target execution
error, baseline error or budget-exhaustion terminal outcome was recorded.
There were **19 error-classified trials** plus three non-discovering stagnation
trials. All 30 reached an actual configured provider attempt. Missing baseline
records on pre-dispatch planning failures are retained as absent, not invented.

Every MODEL ERROR retains REQUEST / HTTP 429 / RESOURCE_EXHAUSTED diagnostics.
All ten workflow assignments failed this way with zero target requests. Inventory
faulty assignment 11 hit the same provider failure; assignment 12 stopped on
CONTRACT_VALIDATION / MODEL PLAN ERROR. Inventory's other three faulty trials
completed. Exact rate/quota cause is not established by allowlisted metadata.
Contract rejection metadata establishes fail-closed validation, not a precise
malformed field or speculative fixture defect. No Gemini, budget or fixture
behavior was changed in response to these observations.

## FR-029 and evidence

Total: **17 exploration journeys, 46 model calls, 165 target requests**.
Phase counts: RESET 33, BASELINE 33, EXPLORATION 51, REPLAY 24, MINIMIZATION 0,
ARTIFACT 24. Every trial's authoritative counter equals its retained budget;
phase totals sum to used requests. All admitted/executed trials have independent
fresh reset/baseline evidence; 33 verified baselines and 33 executed trial
identities are unique across the series. Defaults/deadlines are not enlarged by
later originating phases. Provider calls do not consume target-request budget.

Input usage: **117422 provider-reported + 23450 estimated = 140872**. Output usage
is **UNKNOWN** because 14 failed calls have unavailable output; known provider
output subtotal is **21537**, not a complete total. Per-fixture/variant usage,
requests, journeys, calls, length values/UNKNOWN and evidence references are in
[benchmark.json](benchmark.json).

**Reporting defect discovered after measurement:** the T046 harness chooses
estimated=false whenever telemetry.provider is gemini, including failed-call
fallback input estimates. Thus raw journals incorrectly label 14 input estimates
as PROVIDER. Original journals and raw per-record metrics remain unchanged;
`auditedModelCallUsage`, `auditedTokenMetrics` and audited aggregate/group metrics
use persisted per-call usage flags. `harnessAggregateMetrics` and
`harnessMetricsByFixtureVariant` preserve the original aggregation. This is a
concrete FR-029 attribution defect, not a reason to remove errors or recast the
failed series as PASS. Production code was not changed. A correction and any
future measurement require a separately identified new frozen series.

All eight successful pipelines preserved the exact eligible developer predicate
ID/version/hash across initial evidence, independent replay, minimization, reports,
manifest and supervised assertion evidence. Discovery/replay values were
independently reevaluated from retained non-secret observations as VIOLATED; fresh
baseline/trial identities differ. Per-run IDs, exact predicate references,
planning/proposal evidence, baseline/predicate outcomes and diagnostic metadata
are retained for every assignment in [benchmark.json](benchmark.json) and the
native numbered snapshots. No historical T035–T047 evidence was overwritten.

## Reproduction and engine acceptance

Eight live confirmed journeys were **3 → 3** best verified actions. Ordered deletion
reported LOCAL MINIMUM; producer/predicate-required steps cannot be removed, so no
minimization target requests were needed. This is local irreducibility under the
accepted deletion strategy, not global minimality or a fabricated reduction.
Separate redundant journeys for all three fixtures genuinely reduced **4 → 3** in
the T046 harness tests; those evaluator-supplied results do not enter SC-002.

All eight live pipelines generated current-run Markdown/JSON reports, exact
manifests and fixed offline packages, and supervised verification reached intended
VIOLATED / VERIFIED. Manifest schema/canonical hashes, exact report references,
retained predicate evidence and byte-identical in-memory package rebuilds passed.
Build input closures exclude Gemini, database, originating server/repositories and
the protected executor. Packages were statically revalidated; this is not new
independent runtime acceptance. Eight per-run package/manifest hashes are retained
in `successfulReproductionPipelines` in [benchmark.json](benchmark.json).

Paired runner acceptance is backed by actual retained
[t047-observed.json](t047-observed.json) and [artifacts.md](artifacts.md): for each
fixture 3/3 faulty FAIL / VIOLATED, 3/3 repaired PASS / SATISFIED, immutable
originating state and no independent VERIFIED grant. Its corresponding supervised
manifests are also verified. Current artifact-acceptance tests reran and passed
22/22. Historical developer T043/T044 observations retain their classifications.

| Engine acceptance            | Result | Actual supporting evidence                                                                               |
| ---------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| AP-002                       | FAIL   | This 30-trial frozen series; inventory/workflow thresholds fail                                          |
| AP-003                       | PASS   | T046 separate redundant reduction; T047 paired runtime; current minimization/artifact interruption tests |
| AP-004 engine                | PASS   | Current scope/pinning/redirect/header/dispatch/standalone authority regressions                          |
| AP-005 engine                | PASS   | Current encryption, taint/redaction, model/record/export and protected injection regressions             |
| AP-008                       | PASS   | Current fresh-state, admission, replay/minimization/artifact baseline failure regressions                |
| AP-009 engine                | PASS   | Current budget/cancellation/provider/plan/stop/restart regressions; real 429 stops retained honestly     |
| AP-010                       | PASS   | Current OpenAPI JSON/YAML/profile/ref matrix, deterministic bindings and provenance regressions          |
| AP-011                       | PASS   | Current exact predicate lifecycle, append-only conflicting evidence and artifact verdict regressions     |
| FR-029 raw usage attribution | FAIL   | Fourteen estimated failed-call inputs mislabeled; audited attribution recorded                           |

Per-check test-file counts are retained in `gate5-0964afd0-7aa7-4a71-a063-ce7042585538/validation.json` and
[benchmark.json](benchmark.json). These are engine-level checks, not claims of
finished UI/API acceptance. Project product/API flows, SC-001/007/008, representative
usability/accessibility and visible UI cancellation remain deferred as specified.

## Final validation and scope

Full regression: **858/858 passed, zero failures/skips**, including all 22
harness tests, 22 artifact acceptance tests and existing authority/engine checks.
Typecheck PASS. Artifact structure/reference/hash/budget/freshness validation PASS;
raw harness usage-source defect remains explicitly FAIL. Configured-value and
encoded-value sanitization scan PASS. No TypeScript changed, so changed-file lint
is not applicable. Changed authored Markdown/JSON formatting PASS; runtime-generated canonical journals and packages retain their original bytes.
Known unrelated repository issues remain two lint errors and nine format failures;
no broad cleanup was performed.

Source, tests, fixtures, scripts, migrations, dependencies, historical acceptance
files, retained Gate 4 package and task checklist match their pre-series SHA-256
snapshots. Authority remains RunSupervisor → BudgetManager → frozen policy →
cancellation → sole protected HTTP execution; standalone neutral transport remains
independent. No production behavior or authority semantics changed.

Created only this results document, [benchmark.json](benchmark.json) and the unique
`gate5-0964afd0-7aa7-4a71-a063-ce7042585538/` evidence directory. **Gate 5 FAIL; T048 unchecked; STOP.**
No automatic second series, T049+, optional T058, UI/API work or fixture tuning.
