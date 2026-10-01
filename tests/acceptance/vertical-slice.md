# T035 — Controlled order-lifecycle acceptance

**GATE 2 PASSED on 2026-10-01. T035 complete. T036 not started.**

Real configured Gemini proposed create → cancel → fulfill. The sole supervised dispatcher executed the valid journey after a newly verified baseline. The same order was observed as CANCELLED then FULFILLED. Deterministic evaluation recorded VIOLATED and an append-only initial finding transition to OBSERVED VIOLATION.

| Stage           | Result | Evidence                                                                  |
| --------------- | ------ | ------------------------------------------------------------------------- |
| Provider        | PASS   | Actual Gemini structured output, strict local proposal parse              |
| Plan validation | PASS   | Existing operation, parameter, dependency, predicate and scope validation |
| Baseline        | PASS   | Reset acknowledged, inspection returned `orders: 0`, SATISFIED            |
| Journey         | PASS   | Three completed responses with response-derived order ID                  |
| Predicate       | PASS   | Same order ID, earlier CANCELLED, later FULFILLED → VIOLATED              |
| Candidate       | PASS   | Persisted OBSERVED VIOLATION and append-only transition                   |

## Recorded identities

- Run: `f2fe1e77-3b6e-4dd3-9652-049885ac73a2`.
- Accepted: `2026-10-01T09:36:53.130Z`; deadline: `2026-10-01T09:46:53.130Z`.
- Provider/model: `gemini` / `gemini-3.5-flash-lite`.
- Actual configured-environment model lookup version: `3.5-flash-lite-07-2026`.
- SDK: `@google/genai` 2.24.0; Node 24.21.0.
- Model calls: 1; reported input tokens: 2,120; output tokens: 643; not estimated.
- Journey: `f6287db9-d349-427f-8b56-729c7c8da71f`.
- Trial: `59139d12-b045-4a4a-9645-623115c811fa`.
- Verified baseline: `22c4fd67-30b5-4932-ae65-7b57e0957afb`.
- Predicate: `225e23d0-a46d-4080-a889-271f9ed35016`, version 1.
- Predicate hash: `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
- Initial predicate evidence: `667eaea5-e5eb-435f-aa9d-c8b2f275813e`.
- Finding: `81482f59-1f28-40f8-92b1-74fb13c09e9d`.
- Transition: `86af7f43-9d68-4a4c-8b3b-4100d1946e82`.

Complete sanitized snapshot, exact planning input/output, journey, observations, baseline, predicate evaluation, counters and transition: [vertical-slice-order-passed.json](vertical-slice-order-passed.json).

## Proposed and executed journey

The recorded model rationale was “Journey to verify that an order cancelled cannot be subsequently fulfilled.” No evaluator-authored discovery journey was supplied to the planner.

| Step        | Operation                            | Actual status | Observed state |
| ----------- | ------------------------------------ | ------------- | -------------- |
| `create`    | `POST /api/orders`                   | 201           | CREATED        |
| `cancelled` | `POST /api/orders/{orderId}/cancel`  | 200           | CANCELLED      |
| `later`     | `POST /api/orders/{orderId}/fulfill` | 200           | FULFILLED      |

The order ID came from the create response `/id`; subsequent path operands reference that response. The journey also records explicit producer/consumer dependencies. Gemini expected 409 for fulfillment. The fixture returned its declared 200 response with FULFILLED state. Classification comes from the approved state predicate, not merely the HTTP status difference or model rationale.

The invariant is “an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial.” Existing generic JSON operands, typed equality and supervisor-recorded step indexes express it. Applicability requires CANCELLED, equal order IDs, and `cancelled` before `later`; the assertion requires `later.state` not equal to FULFILLED. No order-specific engine code or arbitrary predicate execution was introduced.

## Scope, budget and fixture integrity

T035 owns `fixtures/api/order-lifecycle.ts`, neutral `fixtures/openapi/order-lifecycle.json`, and separate evaluator-private metadata. The acceptance runner imports this fixture and `scripts/t035-configuration.ts`. It does not import the T024/T025 account fixture or load its configuration. Both variants expose identical public contracts. Local tests prove the repaired variant rejects fulfillment after cancellation and preserves CANCELLED, while normal fulfillment remains valid.

Frozen destination: `http://127.0.0.1:59797/api`, pinned `127.0.0.1`. Scope approval: `67d3579a-9240-49af-b35f-946f50438e88`. Five target intents/responses: one RESET, one BASELINE, three EXPLORATION. All use RunSupervisor → BudgetManager → frozen policy → cancellation → sole dispatcher. The records show no target errors, scope escapes, exploration control operations, redirects, truncated responses or configured credentials. Planner input contains only four exploration operations and the approved invariant, excluding control candidates, scope authority and private variant/trigger metadata. No sensitive fixture values are needed.

Limits: 200 requests, 600 seconds, one exploration journey, ten steps, ten-second request timeout, thirty-second model timeout. After the initial finding, the existing loop stopped at JOURNEY LIMIT without another model call or trial. Terminal status is STOPPED with that reason; completed Gate 2 evidence remains valid. Replay/minimization/artifact counters remain zero.

## Defects and historical attempts

The historical account HTTP 400 run remains unchanged in [vertical-slice-failed.json](vertical-slice-failed.json). Its original write-up is archived in [vertical-slice-account-failure.md](vertical-slice-account-failure.md); it is not evidence for the new order gate.

Provider-only ablations used the same SDK, configured key/model and sanitized context without target requests. Plain prompt, MIME-only JSON and a small JSON Schema succeeded. The full projected Journey/Proposal root union failed HTTP 400 INVALID_ARGUMENT; either full alternative independently succeeded. The adapter already used `responseJsonSchema` correctly. The corrected projection uses one Proposal envelope and limits remote grammar complexity, retaining strict authoritative Zod and deterministic validation. These results isolate the rejected configuration to the full response schema; no exact undocumented backend limit is claimed. The installed SDK and [Google's documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en) describe JSON Schema shaping and application validation.

Order attempts `0bc8382c-d70b-427d-a1f7-92ee285a9587` and `9555626f-ac2e-46c6-bae8-1d43c7adb88d` stopped MODEL PLAN ERROR before dispatch. Their snapshots are preserved in [attempt 1](vertical-slice-order-attempt1.json) and [attempt 2](vertical-slice-order-attempt2.json). Attempt 2 identifies a custom contract-validation failure at `mappings[0]`: missing provenance support. Nonempty rationale was a Zod refinement absent from generation guidance. The projection now requires rationale and permits only proposal-eligible provenance kinds. The authoritative contract was not relaxed. This fix preceded the successful new run. Diagnostics retain allowlisted status/stage/model and issue codes/structural paths, never SDK exception bodies, model values, credentials or authorization headers.

## Verification and limits

Final full Vitest suite: **449 passed, zero failed/skipped**, across 43 files. Typecheck passes. New fixture tests cover both variants, verified empty state, same-order identity, ordering, missing observations, normal transitions and public/planner-context isolation. Provider tests cover correct schema field/MIME type, projection vocabulary and rationale, strict output validation, malformed output and secret-free diagnostics.

Full lint reports two pre-existing explicit `any` annotations in `src/engine/mapping/state.ts`. Full formatting reports pre-existing untouched engine/helper files. T035 files pass focused lint/format checks. No test was disabled or weakened. No T001–T034 task definition was edited during this order-fixture implementation pass.

Commands (Node 24; local configuration supplied separately):

```sh
npm exec -- tsx scripts/t035-acceptance.ts
npm exec -- tsx scripts/t035-audit.ts
TEST_DATABASE_URL=postgresql://kazibadrul@127.0.0.1:55432/postgres npm test -- --reporter=json --outputFile=/private/tmp/ghostqa-t035-order-final.json
npm run typecheck
npm run lint
npm run format:check
```

This proves one autonomous controlled-fixture discovery. It does not claim benchmark acceptance, confirmation, minimization or artifact verification. No CONFIRMED or VERIFIED status is claimed. T036 remains unstarted.

## T037 — Gate 3 independent confirmation

Real configured Gemini Gate 3 passed on the controlled order-lifecycle fixture.
This is a new run; the preceding T035 record and historical snapshots remain unchanged.

- Run: `79ab1d89-18ab-4523-b3d5-0f6ca496103f`
- Finding: `b7d4cc90-1d44-4b23-beb5-fc82a8b4e617` — CONFIRMED, consistent.
- Model: `gemini-3.5-flash-lite`; one model call; ten total target requests.
- Exact predicate: `7319d417-ad31-4476-9c1d-c1943bb3c48a`, version 1,
  canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
- Initial evidence: `ea854174-9b24-4eb7-95bb-2b73476dac18`;
  trial: `08bc2213-cd5e-46a6-bca0-358b51c73866`;
  verified baseline: `e73b5e38-c083-4432-a1be-c66a55e20ffc`.
- Replay evidence: `ce09aae1-d51a-48b4-9569-2571e2dda6e5`;
  trial: `e12e835c-391c-476f-968e-291955c8b36d`;
  verified baseline: `60569eaf-a10c-4495-9317-89f69c2f526b`.

Both trials independently reset and verified fresh state. The exact eligible
predicate evaluated VIOLATED in each trial. Finding transitions were deterministic,
append-only and persisted through the existing supervised dispatch architecture.
Gemini had proposal-only authority. T038/minimization has not started.

See [T037 checkpoint](t037.md) and [new Gate 3 evidence](t037-order-passed.json).

## Gate 4 / T044 — automated integration complete, live acceptance pending

Reproduction mode now composes discovery, independent confirmation, deterministic
minimization, Markdown/JSON reports, exact manifest, supervised verification and
fixed package generation through the existing production components and one
originating supervisor/budget. Historical Gate 2/3 evidence above is retained.

Live Gate 4 has not passed yet. Actual live journey lengths, new run/evidence IDs,
manifest/package identities and supervised VERIFIED evidence await developer
execution of `npm exec -- tsx scripts/t044-acceptance.ts`. No 6 → 3 live result is
assumed. See [T044 checkpoint](t044.md) for automated results, authority coverage
and developer acceptance instructions. T044 remains unchecked; T045 is untouched.

## T044 — Gate 4 passed (developer-executed live acceptance)

The earlier pending Gate 4 entry above is superseded by successful developer
execution in Warp: run `601fa890-5598-47a0-beb8-50471fb4e72a`, real Gemini
`gemini-3.5-flash-lite`, OBSERVED VIOLATION → independent fresh CONFIRMED →
best verified reproducer **3 → 3** → Markdown/JSON → exact manifest → supervised
VIOLATED / VERIFIED → fixed standalone package. Ordered deletion reached LOCAL
MINIMUM; no global minimality or discovery-rate claim is made.

Predicate `ec75b098-3679-46df-ba39-69f0d0b0883e`, version 1, hash
`ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`
was retained throughout. Three distinct fresh baselines/trials and independent
trial-local order IDs are retained. One originating budget consumed 15/200
requests (0 → 5 → 10 → 10 → 15), with unchanged limits and deadline.

Manifest hash:
`7f84e67e59446eaa620a1cea2aa55a5d982e8f0c9307de66fd5d258bbe048ddc`.
Package hash:
`2629117f0d5a63f1c7fc0e4568571bc3e12008a11b1cd91fc849e435c3f78bca`.
The retained package matches an in-memory build-only reconstruction byte for byte;
its dependency closure preserves standalone isolation. No standalone runtime was
performed during closure. Historical evidence and authority semantics remain
unchanged. The earlier MODEL ERROR's exact cause remains undetermined.

See [retained Gate 4 evidence](t044-order-601fa890-5598-47a0-beb8-50471fb4e72a.json),
[T044 checkpoint](t044.md) and [closure results](t044-results.json). T044 is checked;
T045 and later tasks remain untouched. Historical Gate 2/3 records above are
preserved. Prior full regression: 798/798; closure authority checks: 6/6.
