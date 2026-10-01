# T048 — Post-Gate-5 failure analysis

Historical series `gate5-0964afd0-7aa7-4a71-a063-ce7042585538` remains **FAIL**. T048 remains
unchecked; AP-002 remains FAIL. This analysis/correction occurs between frozen
series. **No new live model call or Gate 5 series was executed.** T049 and optional
T058 remain untouched.

## Historical integrity

Before editing, SHA-256 snapshots covered **129 historical files**: the full
series directory plus the historical `benchmark.json` and `results.md`. All remain
byte-identical. The new machine-readable [analysis](t048-failure-analysis.json)
retains those hashes, all 30 matrix rows, actual assigned run/execution trial IDs,
per-round planning IDs/evidence, provider diagnostics, normalized proposal hashes,
feedback counts and post-correction validation. Original outcomes, denominators,
frozen identities, raw journals, packages and conclusions were not rewritten.
Native `readBenchmark` still resolves 30 records and the historical rates. Other
historical acceptance files, fixtures, engine authority code, scripts, dependencies
and task checklist remain unchanged. Old source/build comparisons must use retained
historical hashes; they must not compare the corrected current CLI to the old freeze
and pretend the series was measured with that corrected build.

## Deterministic 30-trial matrix

Numbering matches the frozen assignment ledger. Assigned run UUID identifies the
benchmark attempt; execution trial UUIDs are actual fresh lifecycles, not model
round/audit UUIDs. Pre-dispatch failures have **no execution trial**, rather than
fabricated baseline/trial IDs. PROPOSED is a valid persisted proposal; MODEL PLAN
ERROR in the provider-result column is planner telemetry for a returned response
rejected downstream, not an API availability error. M/J/R = model calls /
exploration journeys / target requests. Predicate outcomes include the actual
exploration/replay/artifact evidence where present.

| #   | Fixture / variant             | Assigned run ID                        | Execution trial IDs                                                                                                  | Discovery          | Confirmation  | Terminal reason       | Provider-call result      | Proposal validation     | Stagnant rounds | M/J/R      | Usable journey? | Invariant evaluated | Sanitized evidence                                                      |
| --- | ----------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | --------------------- | ------------------------- | ----------------------- | --------------- | ---------- | --------------- | ------------------- | ----------------------------------------------------------------------- |
| 1   | order-lifecycle / faulty #1   | `1ae77195-4079-4629-948e-f818610e6ed2` | 5ffe0752-174f-4c0a-bf05-20037e2f1751<br>852a964f-7f27-4d4a-b0ab-7c44ef272fe5<br>a83453a0-7bf2-430f-ad16-2c0d91c95591 | OBSERVED VIOLATION | CONFIRMED     | REPRODUCTION COMPLETE | PROPOSED×1                | ACCEPTED                | 0               | 1 / 1 / 15 | YES             | VIOLATED            | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/1/evidence.json)  |
| 2   | order-lifecycle / faulty #2   | `bce853ab-b10d-49fc-9aa7-f834d1c9bc77` | bf141d50-375c-48ba-8709-b20b98e3caa9<br>dffeab3c-cf9c-465f-a37d-f3d2fd6cd1c0<br>e835cf32-ced4-400e-b0bf-bad3488fd8ee | OBSERVED VIOLATION | CONFIRMED     | REPRODUCTION COMPLETE | PROPOSED×1                | ACCEPTED                | 0               | 1 / 1 / 15 | YES             | VIOLATED            | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/2/evidence.json)  |
| 3   | order-lifecycle / faulty #3   | `ea34c5e3-1b28-4741-86a9-3521d33e8d2d` | 8b39f66e-31d8-4973-9bb4-b4e39ea503f9<br>dd93fd67-cb9f-43d3-82e2-f6e1ca030f29<br>f451c203-4b9f-4464-85ba-73799428abe6 | OBSERVED VIOLATION | CONFIRMED     | REPRODUCTION COMPLETE | PROPOSED×1                | ACCEPTED                | 0               | 1 / 1 / 15 | YES             | VIOLATED            | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/3/evidence.json)  |
| 4   | order-lifecycle / faulty #4   | `bd670426-6159-4500-bd27-d49118082aa0` | 552ab83c-0415-477d-88f5-71f83c40e335<br>b96bb61e-55af-4d27-964d-948307676dbe<br>c8aa8d9c-c602-43a2-9014-14cc9b97ea09 | OBSERVED VIOLATION | CONFIRMED     | REPRODUCTION COMPLETE | PROPOSED×1                | ACCEPTED                | 0               | 1 / 1 / 15 | YES             | VIOLATED            | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/4/evidence.json)  |
| 5   | order-lifecycle / faulty #5   | `93e5d5a0-8b73-4261-88f7-ea9dbee1063f` | 1335348e-4ff3-4709-8b4a-75d0028ed3e8<br>4035846d-d23c-49bd-b855-2d4ea064020a<br>e8f88065-b215-4903-b329-d520f17f4255 | OBSERVED VIOLATION | CONFIRMED     | REPRODUCTION COMPLETE | PROPOSED×1                | ACCEPTED                | 0               | 1 / 1 / 15 | YES             | VIOLATED            | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/5/evidence.json)  |
| 6   | order-lifecycle / repaired #1 | `f93f1450-38dc-4d65-a2ae-43e6a0c22a8d` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL PLAN ERROR      | MODEL PLAN ERROR×1        | REJECTED / rule UNKNOWN | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/6/evidence.json)  |
| 7   | order-lifecycle / repaired #2 | `24e35e74-eddb-4b62-bf47-38264893f14f` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL PLAN ERROR      | MODEL PLAN ERROR×1        | REJECTED / rule UNKNOWN | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/7/evidence.json)  |
| 8   | order-lifecycle / repaired #3 | `fe8807a5-2716-4b5a-ac98-7478569a3d7b` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL PLAN ERROR      | MODEL PLAN ERROR×1        | REJECTED / rule UNKNOWN | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/8/evidence.json)  |
| 9   | order-lifecycle / repaired #4 | `223fed5d-a2c7-44c1-b9bd-c7fbf3ef0bdd` | e127454a-fbf4-487e-bae9-ca924b2636db<br>e4a627bf-a085-48cd-ba08-acdc608ccd45                                         | NOT OBSERVED       | NOT ATTEMPTED | STAGNATION            | PROPOSED×5                | ACCEPTED                | 3               | 5 / 2 / 10 | YES             | SATISFIED           | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/9/evidence.json)  |
| 10  | order-lifecycle / repaired #5 | `d4ef84a8-d42d-4b8a-ac07-db84553d6e04` | 182c15d8-2934-4648-9e03-a41cf23a00e4<br>e70891b2-7c04-4ffc-b12c-3531741eac44                                         | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | PROPOSED×3, MODEL ERROR×1 | ACCEPTED                | 1               | 4 / 2 / 10 | YES             | SATISFIED           | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/10/evidence.json) |
| 11  | inventory / faulty #1         | `c64b7a85-fb75-4824-b3fe-f43be1db1657` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/11/evidence.json) |
| 12  | inventory / faulty #2         | `c5a8d216-41f7-4420-ae0c-0b69265ee6f2` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL PLAN ERROR      | MODEL PLAN ERROR×1        | REJECTED / rule UNKNOWN | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/12/evidence.json) |
| 13  | inventory / faulty #3         | `3eaf3a9a-798c-4ad4-9b76-5d1ffbfb8024` | a591becf-4da3-4d72-9f75-d1e2b6b754ad<br>e497f2c7-40c8-4230-b889-70585916995e<br>ec48769b-7d95-4ddf-842a-5eb1ba63d4e7 | OBSERVED VIOLATION | CONFIRMED     | REPRODUCTION COMPLETE | PROPOSED×1                | ACCEPTED                | 0               | 1 / 1 / 15 | YES             | VIOLATED            | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/13/evidence.json) |
| 14  | inventory / faulty #4         | `90c02d8a-590d-47db-9e25-04a734c1cb2b` | 70b25b64-42d3-4dcd-a5b4-d0829e7753f2<br>e07b2703-ba26-4a4d-a15a-8acf115ebe6b<br>ff7164a4-c979-4810-bca6-1b6cd5b6eba8 | OBSERVED VIOLATION | CONFIRMED     | REPRODUCTION COMPLETE | PROPOSED×1                | ACCEPTED                | 0               | 1 / 1 / 15 | YES             | VIOLATED            | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/14/evidence.json) |
| 15  | inventory / faulty #5         | `74e5251e-49fc-4ec3-9f3a-37bfe5b367ce` | 3777d7b3-67e7-40a3-b203-0cb9ff7c5371<br>3ca08709-501d-4515-8e5b-79becb0ce204<br>9646e0f7-9073-4d6e-a845-77985a5045e2 | OBSERVED VIOLATION | CONFIRMED     | REPRODUCTION COMPLETE | PROPOSED×1                | ACCEPTED                | 0               | 1 / 1 / 15 | YES             | VIOLATED            | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/15/evidence.json) |
| 16  | inventory / repaired #1       | `87482f03-2fd5-46c6-aa0e-d6890002a9f5` | 04a55167-b66e-41db-ae03-40b65a56b9ce<br>b7f1a7ad-34c4-42ac-baf9-77bcb41ea00e                                         | NOT OBSERVED       | NOT ATTEMPTED | STAGNATION            | PROPOSED×5                | ACCEPTED                | 3               | 5 / 2 / 10 | YES             | SATISFIED           | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/16/evidence.json) |
| 17  | inventory / repaired #2       | `5b920534-da3b-4dba-85bd-4cce48efdd1b` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL PLAN ERROR      | MODEL PLAN ERROR×1        | REJECTED / rule UNKNOWN | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/17/evidence.json) |
| 18  | inventory / repaired #3       | `a7116bfb-f64a-4d51-9582-33f4020e888b` | 33dd7b98-188a-431f-acd7-09b6175dab6b<br>ca2032ba-8721-43f7-8fb8-458a88c96abd                                         | NOT OBSERVED       | NOT ATTEMPTED | STAGNATION            | PROPOSED×5                | ACCEPTED                | 3               | 5 / 2 / 10 | YES             | SATISFIED           | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/18/evidence.json) |
| 19  | inventory / repaired #4       | `3206cb81-e79d-49c4-967a-1692f7b7ba2d` | 5d7fe93f-a5f9-47c0-924f-dc6c928b6906                                                                                 | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | PROPOSED×1, MODEL ERROR×1 | ACCEPTED                | 0               | 2 / 1 / 5  | YES             | SATISFIED           | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/19/evidence.json) |
| 20  | inventory / repaired #5       | `08d258b5-2945-4d7a-bb67-06edbe340dc4` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/20/evidence.json) |
| 21  | workflow / faulty #1          | `e3f0fd0e-106d-4cb7-b3b6-eed3eefcedb2` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/21/evidence.json) |
| 22  | workflow / faulty #2          | `4c6d588a-b684-4c87-b33e-1b7139402947` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/22/evidence.json) |
| 23  | workflow / faulty #3          | `c8beb97d-0625-4cb6-bcef-eaa9b3d6a539` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/23/evidence.json) |
| 24  | workflow / faulty #4          | `882ede05-f714-4671-96a0-7bf1658332a4` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/24/evidence.json) |
| 25  | workflow / faulty #5          | `78e0b66e-c9b9-4c05-b204-08af27ef0836` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/25/evidence.json) |
| 26  | workflow / repaired #1        | `49337009-822c-4611-85cb-8c6e646a5b94` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/26/evidence.json) |
| 27  | workflow / repaired #2        | `0e855ea1-3314-4ab6-8a86-bbc04efa0103` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/27/evidence.json) |
| 28  | workflow / repaired #3        | `34a0b9cd-3596-4769-a8d8-569264c463a1` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/28/evidence.json) |
| 29  | workflow / repaired #4        | `2eaa9207-e1fa-4d69-b20b-0cb2daa29eed` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/29/evidence.json) |
| 30  | workflow / repaired #5        | `36044720-151e-462e-b303-ee10b7c7604a` | NONE (pre-dispatch)                                                                                                  | NOT OBSERVED       | NOT ATTEMPTED | MODEL ERROR           | MODEL ERROR×1             | NOT REACHED             | 0               | 1 / 0 / 0  | NO              | NOT EVALUATED       | [evidence](gate5-0964afd0-7aa7-4a71-a063-ce7042585538/30/evidence.json) |

For every failed faulty trial the immediate observed cause is:

- **A, provider availability/rate limiting:** inventory #11 and workflow #21–25.
  REQUEST / HTTP 429 / RESOURCE_EXHAUSTED, before a usable journey or target dispatch.
- **B, model/planner contract validation:** inventory #12. CONTRACT_VALIDATION /
  MODEL PLAN ERROR after a returned provider reply; exact rejected rule is unavailable.
- No failed faulty trial has category C stagnation, D deterministic execution/
  baseline/predicate failure or E budget exhaustion.

## RESOURCE_EXHAUSTED distribution and pacing

| Fixture         | Faulty | Repaired | Frozen trial ordinals |
| --------------- | ------ | -------- | --------------------- |
| order-lifecycle | 0      | 1        | 10                    |
| inventory       | 1      | 2        | 11, 19, 20            |
| workflow        | 5      | 5        | 21–30                 |
| Total           | 6      | 8        | 14 trials/calls       |

Every failed API call is retained in `rateLimitedCalls` with global call position,
run ID, repetition, error stage/status and result evidence ID. The first 429 is
trial 10's fourth proposal round (global call 17). Valid returned replies occurred
after that initial 429; the retained sequence does not establish a continuously
exhausted daily quota or a particular quota dimension. All ten workflow calls
later received 429. RESOURCE_EXHAUSTED does not reveal the provider project's
configured capacity, request/token/daily limit, reset window or Retry-After value;
these are unavailable in retained allowlisted metadata. No numeric Gemini quota
is assumed.

`runBenchmark` awaits each assignment exactly once in its ordered loop.
`runVerticalSlice` awaits exploration; `explore` awaits each supervised planning
round. `RunSupervisor.plan` rejects overlapping planning/queue activity. Gemini
uses one awaited stream and SDK retry attempts=1. Hash/file parallelism is not
model-call concurrency. No trial/model overlap, hidden retry, copied budget or
already-defined pacing violation was found. The accepted spec requires rate-limit
failures to stop MODEL ERROR without retries; the plan explicitly identifies
provider throttling as an external measurement risk. No request-spacing/rate limit
is configured in the harness/provider contract. Adding invented sleeps or retries
would change measurement semantics without establishing a violated requirement.

Thus no provider/orchestration correction is justified by these journals. Future
capacity must be verified by the operator against the actual provider account
before another separately authorized series; no provider dashboard/model lookup
or additional live call was made here.

## Five contract rejections

| Trial | Fixture / variant           | Retained stage      | Exact rule / rejected shape |
| ----- | --------------------------- | ------------------- | --------------------------- |
| 6     | order-lifecycle repaired #1 | CONTRACT_VALIDATION | UNKNOWN / not retained      |
| 7     | order-lifecycle repaired #2 | CONTRACT_VALIDATION | UNKNOWN / not retained      |
| 8     | order-lifecycle repaired #3 | CONTRACT_VALIDATION | UNKNOWN / not retained      |
| 12    | inventory faulty #2         | CONTRACT_VALIDATION | UNKNOWN / not retained      |
| 17    | inventory repaired #2       | CONTRACT_VALIDATION | UNKNOWN / not retained      |

Each made one model call, admitted no exploration journey and dispatched zero
target requests. Its failed PLANNING RESULT contains telemetry/usage only, with no
proposal or rule-level diagnostic. Provider usage was captured after ReplySchema
parsing; the failure path is downstream `requestProposal` validation rather than
Gemini API failure or deterministic target execution. Adapter generation first
passes JSON parsing and local Proposal/Journey Zod validation; downstream validation
also checks dependencies, operations/parameters/bodies, hypothesis eligibility/hash,
exact approved predicate reference, required evidence-role steps, limits and
sanitization. That catch collapses these alternatives to CONTRACT_VALIDATION.
The original failed schema/field/values cannot be reconstructed from token counts
or a different proposal made later. No exact violation, model-output shape or
schema mismatch is invented, and no live reproduction was attempted.

The generation schema is deliberately an output-shaping projection, with one
Proposal envelope, generation-only provenance/rationale guidance and a smaller
vocabulary. Local Zod and semantic execution validation remain authoritative;
array bounds, references and semantic dependencies need not be representable in
Gemini's grammar. Source inspection and current provider/schema/planner regressions
identify no **demonstrated causal** validator/generation disagreement or unnecessarily
strict engine rule behind these five observations. It remains unknown whether each
original rejected plan violated a valid contract or exposed an unretained defect.
No schema, prompt, validator or fixture-specific exception was changed on speculation.

## Three stagnation stops

Trials **9 (order-lifecycle repaired), 16 and 18 (inventory repaired)** each made
five valid proposals, executed two three-action exploration journeys (10 target
requests including reset/baseline), evaluated SATISFIED twice, and ended with
stagnantRounds=3. The exact per-round hashes and feedback are in `stagnationStops`
in the new analysis JSON.

For all three, normalized novelty was **new, new, duplicate, duplicate, duplicate**.
The first journey used extracted-variable path bindings; the second used direct
previous-response JSON operands. Those are distinct binding structures under the
accepted normalization despite identical operation order. IDs/rationale/expected
status edits do not create novelty. The next three proposals reused the second
hash. `planningResult(false)` incremented the same authoritative stagnation counter
and stopped on the third consecutive duplicate before dispatching it. No model
loop restart or mutation retry occurred.

The subsequent contexts contained observation/mapping/seen-hash counts:
0/4/0 initially, 3/10/1 after the first trial, then 6/16/2 for the remaining rounds.
They included actual repaired response state/status, inferred dependencies and
observed transition mappings from public behavior. All four exploration operations
remained available; the ordinary GET inspection operation was permitted but not
selected. Control operations and evaluator registry fields remained absent.
No general feedback omission or novelty-rule defect is demonstrated. Model failure
to explore other permitted operations on these repaired runs is an observed outcome,
not proof of a faulty discovery-engine defect or grounds for hidden hints.

**Workflow 0/5 faulty** is fully localized to five API 429 failures: there were no
valid workflow proposals, target requests or predicate evaluations. Its capacity
to construct the state transition was not measured successfully. **Inventory 3/5**
reflects one 429 and one unlocalized contract rejection; its other three faulty
runs genuinely discovered, independently confirmed and verified the invariant.
There was no inventory faulty stagnation or baseline/predicate/execution failure.

## AP-002 conclusion

AP-002 fails the same per-fixture SC-002 conditions: inventory 3/5 and workflow
0/5 discoveries **and** confirmations, below 4/5. Repaired confirmations remain
0/5. No additional execution/confirmation defect is demonstrated by AP-002;
external and validation errors correctly remain in denominators. The reporting
attribution defect is a separate FR-029 defect; fixing it cannot change measured
AP-002 outcomes or make the historical series PASS. Prior paired artifacts and
engine regressions do not substitute for autonomous discovery thresholds.

## Confirmed correction and regressions

Changed only `src/cli/benchmark.ts` and `tests/benchmark/harness.test.ts`:

- `planningTokenMetrics` extracts the existing usage projection and respects
  persisted `usage.estimated`; provider name can no longer turn a fallback
  estimate into PROVIDER. Missing input may be estimated from sanitized UTF-8
  context bytes; missing output without a usable proposal remains UNKNOWN/null.
- Existing `totalTokens` is exported for direct contract coverage. Mixed known
  provider/estimated counts retain ESTIMATED attribution; any unknown constituent
  keeps the aggregate UNKNOWN. The existing combined estimated flag is conservative
  for mixed usage; no new incompatible token representation was introduced.
- Eight added tests cover provider-reported counts, explicit estimates, failed
  Gemini telemetry, missing input/output, mixed attribution, unknown aggregation,
  JSON/report-summary roundtrip and a real supervised local run with an injected
  429 provider. That injected test makes no external call or measured series.

Test-first: 22 existing harness tests passed, eight new regressions failed; the
supervised integration regression reproduced PROVIDER instead of ESTIMATED. The
other tests first exposed the missing pure metric boundary. After correction all
30 harness tests pass. No discovery, predicate, scope, supervisor, budget,
provider, retry, prompt, fixture, dispatcher or standalone behavior changed.
Only future benchmark reporting changes; historical labels/journals stay intact.

The current non-executing identity snapshot records engine hash
`681152c18aa32cd2504661029a44fb6a0b31b74b00db7d8bcf05381467054857`. Only engineHash differs from the
historical freeze because CLI source changed; dependency/prompt/model/fixture,
compiled worker build and configuration hashes remain unchanged. A **new unique
frozen series is required** after this correction, even when some component hashes
are identical. This snapshot is not a new benchmark or acceptance claim.

## Validation and stop boundary

Focused benchmark/provider/planner/authority checks: **138/138**, including all
30 harness tests. Full regression: **866/866**, zero failures/skips.
Typecheck, changed-file ESLint/Prettier and configured-value/encoded-value
sanitization PASS. Final integrity checks verified all 129 historical hashes, all
30 outcomes/rates and byte-identical rebuilds of the eight retained packages.
The accompanying analysis JSON records these checks.
Known unrelated repository issues remain two lint errors and nine format failures;
no broad cleanup was performed. All 129 historical evidence file hashes remain
unchanged, including raw journals, final result artifacts and packages. No task
checkbox was changed.

For a future independently authorized series, after fresh pre-flight and verified
available provider capacity, configure the normal protected local environment and
disposable test database separately, then use a **new output directory**:

```sh
npm run benchmark -- --approve-local-fixtures --output "tests/acceptance/gate5-$(uuidgen | tr '[:upper:]' '[:lower:]')"
```

This command is a recommendation only; **it was not executed**. No automatic second
series, quota guessing, model switch, retry, prompt tuning or benchmark-result rewrite.
T048 remains unchecked. T049 and all later tasks, including optional T058, remain
untouched. STOP.
