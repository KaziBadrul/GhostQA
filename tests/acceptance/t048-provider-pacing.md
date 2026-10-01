# T048 — Provider pacing correction between frozen series

The developer observed a project limit of **15 requests/minute** in Google AI Studio for `gemini-3.5-flash-lite`. The application defaults to a conservative **12 RPM**, equivalent to **5,000 ms minimum spacing between model dispatch starts**. This is supplied operator evidence, not a quota inferred from historical failures or a universal Gemini quota claim.

## Implementation

`src/engine/planning/pacing.ts` provides monotonic-clock pacing with an injectable clock, cancellation-aware waits and ordered callers. `src/engine/planning/gemini.ts` invokes it immediately before its existing SDK stream request. Process-local state is shared by hashed API-key/model identity across provider instances and trials; creating a new provider does not reset spacing. The registry never logs or exports its key. A more restrictive ceiling can tighten existing state; loosening it requires a new process.

`GEMINI_REQUESTS_PER_MINUTE` is parsed using existing application configuration conventions in `src/server/config.ts`; it defaults to 12 and accepts positive integer RPM values. Benchmark, vertical-slice and developer Gate 4 entry points pass the configured value to the same provider adapter. Pacing is exclusively for model calls. It has no target dispatcher, supervisor, run budget, policy, evidence repository or artifact-status capability.

`freezeBenchmark` records `configuration.modelPacing.requestsPerMinute` and `minimumDispatchSpacingMs`. Changing pacing changes the frozen configuration identity. The benchmark CLI supplies the actual runtime pacing value both for the initial freeze and drift checks. Required assignments remain 30; failed trials stay in their denominators.

This is **pacing, not retry**: wait when necessary, invoke the SDK once, return success/failure normally. A failure consumes its dispatch-spacing slot. Both SDK retry settings remain `attempts: 1`. There are no replacements, hidden retries, predicate changes, planner instruction changes, fixture hints or threshold changes. Waiting consumes the existing model/run elapsed-time allowance; cancellation/deadline expiry prevents later dispatch.

Pacing is process-local and cannot control other applications or operators sharing the same provider project. A new process does not inherit the previous process's dispatch history. For Series 3, avoid concurrent project callers and allow provider capacity to recover before starting. The correction does not guarantee absence of 429s from other quota dimensions or external traffic.

## Files and regression coverage

- New `src/engine/planning/pacing.ts` and `tests/contract/provider-pacing.test.ts`.
- Modified provider adapter, application configuration, benchmark freeze/CLI, vertical-slice CLI and `scripts/t044-acceptance.ts` to pass configuration.
- Existing Gemini contract tests use isolated injected clocks so they do not wait real five-second intervals.
- Benchmark harness regression proves changed pacing changes configuration identity without changing 30 required assignments.

Eight pacing regressions cover immediate/eligible dispatch, delayed dispatch, concurrent spacing, failed-call/no-retry behavior, cancellation, adapter-level 429 rejection, configuration validation, shared state and absence of target authority. One additional benchmark regression covers freeze identity and unchanged denominator configuration. The new test file initially failed to load because the pacing production module did not exist; implementation then made its contract green.

## Validation

- Focused provider/pacing/configuration/planner/benchmark/sole-dispatch/standalone-authority/secret tests: **142 passed, 0 failed, 0 skipped**.
- Full regression: **880 passed, 0 failed, 0 skipped** (871 prior tests plus nine new regressions).
- Typecheck: PASS.
- Changed-file lint/format: PASS.
- Sanitization/static checks: PASS — existing secret and authority regressions; configured protected-value scan of changed/new files; SDK retry options still attempts:1. No live provider call was made.
- Both historical series: **243 retained files byte-identical by SHA-256** against the pre-change snapshot. Historical benchmark outcomes, denominators, frozen hashes and raw journals were not edited.

Current source-tree engine hash: `e5bfe5a19e33fe43f2540a35e11ee4d446e81bae56106b9b96667acd1dfbe168`. Emitted worker build hash: `b9aecf93eff8d9d3ecc3abb1a1b91df1244bb5aaf692566ed166e49549c18d21`. These are static checks, not a newly executed benchmark series.

Runtime behavior and engine/configuration identity changed, so a future series must use a new frozen identity. The currently emitted engine/import worker bundle hashes remained unchanged: model pacing executes at the provider boundary outside those workers. No measured series was run or rewritten. Known prior unrelated repository issues were 2 lint errors and 9 formatting failures; no repository-wide cleanup was performed.

## Next operator action — not executed here

With the intended Gemini configuration, existing local test database configuration, available provider capacity and no competing GhostQA process:

```sh
GEMINI_REQUESTS_PER_MINUTE=12 npm run benchmark -- --approve-local-fixtures --output "tests/acceptance/gate5-$(uuidgen | tr '[:upper:]' '[:lower:]')"
```

This creates a new frozen series; it does not resume or replace either failed historical series. This session did not execute Series 3 or make any discovery-rate claim. **T048 remains unchecked; T049 and optional T058 remain untouched.**
