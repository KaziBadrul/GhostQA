**# Tasks: GhostQA MVP**



**\*\*Input\*\***: \`specs/001-ghostqa-mvp/\` specification, both clarification passes, final plan/research,

data model, contracts, quickstart, quality checklist, constitution, PRODUCT.md and DESIGN.md.

**\*\*Prerequisites\*\***: completed plan and resolved single-dispatch ownership decision.

**\*\*Tests\*\***: Explicitly requested; write focused contract/security/behavior tests before the related

implementation and verify failures, then pass them. No application work is performed by this file.

**\*\*Organization\*\***: Setup/foundation first; US1 discovery → US2 reproduce/export → US1/US2/US3

required fixtures/benchmark/engine acceptance → application increments → product acceptance/hardening.

A–T responsibility labels are retained while benchmark work moves ahead of product surfaces. Each task lists earlier prerequisites, precise paths and a verification outcome.



**## Format and paths**



\`- [ ] T### [P?] [US#?] Description — Depends: T###; ...\`

All paths are repository-relative; [US1]/[US2]/[US3] map to spec stories, shared tasks have no story

label. [P] is optional work on distinct files only after every listed dependency passes. Solo

execution defaults to ascending required-task IDs, skipping optional T058; its prerequisite is still an earlier task. Proposed files are created during implementation, not now.



**## Non-negotiable execution authority**



\`RunSupervisor → BudgetManager → frozen ScopePolicy / operation policy → cancellation check

→ deterministic HTTP Executor\`



All reset, baseline, exploration, replay, minimization and in-run artifact verification use this

single supervisor-owned path. Worker computes/submits intents only. No second network-authorized

worker, phase-local budget, LLM execution capability, or exported-runner dispatch exists inside

the originating run. Cancel ACK, advisory-lock loss and shutdown close one gate; after awaited

persistence recheck gate immediately before dispatch. Effects already delivered are not undone.

Exact manifest is verified in existing engine; independent developer runner has fresh approval,

credentials/budget and no authority to change original evidence or grant VERIFIED.



The one frozen operation policy classifies exploration, reset-only, baseline/inspection-only and

excluded operations, with explicit phase permissions inspected before approval. Journey actions

in replay/minimization/artifact phases retain frozen journey-operation permissions. Control actions

remain confined to reset/baseline subphases; excluded operations never execute. RunSupervisor owns

actual trial/phase context; submitted phase tags never grant authority. Planner filtering is not

a security boundary: the sole dispatcher independently enforces this same policy.



**## Phase 1 — A: Repository foundation**



**\*\*Goal\*\***: Create the single TypeScript application and reproducible test/database environment.



**\*\*Independent verification / checkpoint\*\***: Typecheck/lint and a Vitest smoke test pass; migration setup works on an empty test database.



\- [X] T001 Initialize Next.js 16/TypeScript 5/Tailwind 4 on Node 24 in package.json, tsconfig.json, next.config.ts, src/app/layout.tsx and src/app/globals.css; enable strict TypeScript and Node runtime routes, preserve existing docs, and pin compatible dependencies in package-lock.json. Verify build/typecheck; no backend service, ORM or queue. — Depends: none.

\- [X] T002 Configure lint/format and Vitest in eslint.config.mjs, .prettierrc.json, vitest.config.ts and tests/helpers/setup.ts; expose quickstart test scripts in package.json and verify an intentionally failing assertion is detected before its smoke test passes. — Depends: T001.

\- [X] T003 Define strict environment/application configuration in src/server/config.ts and tests/unit/config.test.ts for DATABASE_URL, separately stored 32-byte credential key, explicit GEMINI_MODEL/GEMINI_API_KEY, loopback UI and planned bounds; reject missing/invalid values without logging secrets. No assumed Gemini model availability. — Depends: T002.

\- [X] T004 Implement parameterized pg connection/migration harness in src/server/db.ts, src/server/migrate.ts and tests/helpers/database.ts with package.json db:migrate script; verify isolated rollback/reset, connection failure and numbered migration ordering; no ORM. — Depends: T003.



**## Phase 2 — B–D: Foundational contracts, authority, network and secrets**



**\*\*Goal\*\***: Establish mandatory shared execution controls before any story sends target requests.



**\*\*Independent verification / checkpoint\*\***: Runtime contract, budget, cancellation, scope and secret tests pass before enabling transport integration.



\- [X] T005 Implement strict Zod/inferred TypeScript contracts in src/engine/contracts/api.ts, journey.ts, predicate.ts, execution.ts, run.ts and artifact.ts with tests/contract/core.test.ts: ApiOperation/ApiParameter/ApiModel, StateVariable/StateMapping, Journey/JourneyStep, Predicate/BaselineAssertion/ResetConfiguration, ExecutionContext/ExecutionResult/Observation/Evidence/Finding, RunBudget/TestSession/Run and RegressionArtifact. Reject unknown fields; encode data-model constraints "at most ten journey steps", "required baseline assertions nonempty", "unique id/version" and GENERATED plus UNVERIFIED/VERIFIED separation. Model BaselineEvidence separately from evidence requiring a baseline ref; validate no self-reference. Encode the single frozen phase-aware operation policy with exploration, reset-only, baseline/inspection-only and excluded categories plus explicit permitted phase mappings; exclusion overrides all permissions. Supervisor-controlled trial context determines phase, never journey/model/request fields. — Depends: T002.

\- [X] T006 Create migrations/001_core.sql and tests/integration/migrations.test.ts for projects, snapshots, credentials, predicates/approvals, resets, runs, journeys, step records, observations, evidence, findings/transitions and artifacts using UUID/timestamptz/JSONB/FKs/indexes. Preserve "Append-only", "immutable version", "One active global run", "No raw body/header/token columns" and project cascade deletion; verify constraints and run snapshot immutability (data-model.md). — Depends: T004, T005.

\- [X] T007 Write tests/unit/budget.test.ts for FR-006 full-trial admission, dispatch-time accounting, failed-request charging, one shared 200-request/10-minute default, 20 exploration journeys, 10 steps, reset/check lengths <=10, <=10s request and <=30s model deadlines, no retries and monotonic expiry; verify the tests fail before implementation. — Depends: T005.

\- [X] T008 Implement the sole authoritative src/engine/budget/manager.ts with immutable limits, phase counters, trial admission, dispatch consumption, model/stagnation telemetry and terminal cancellation state; pass budgettests without phase-local counters. Defaults/bounds from FR-006/028 and lifecycle contract. — Depends: T007.

\- [X] T009 Write tests/integration/supervisor.test.ts for one active run, advisory-lock loss, shutdown, cancellation during awaited persistence, crash recovery and hot-reload duplicate start; assert zero new dispatch after gate closure and no resumed mutations (FR-017/023, final ownership decision). Test durable accepted run/snapshot before dispatch, crash after intent persistence before known response, uncertain intent remaining conservatively charged, INTERRUPTED restart with no mutation replay and duplicate supervisor unable to dispatch. — Depends: T006, T008.

\- [X] T010 Implement server.ts, src/server/run-supervisor.ts, src/engine/session/worker.ts and src/engine/contracts/messages.ts with persistent Next lifecycle, supervised computation worker and supervisor-owned dispatch gate/BudgetManager; strict intent messages carry no target socket capability. Hold dedicated pg advisory lock, close gate on loss/shutdown/cancel, watchdog parse/run deadlines, ACK only after closure and mark prior nonterminal runs INTERRUPTED. Pass supervisortests using fake transport. Establish minimum durable persistence now in existing src/server/repositories/runs.ts: accepted run record, immutable execution configuration/scope/operation-policy snapshot, ownership/interruption state and recovery queries before transport can be enabled. Persisted ownership supports audit; the dedicated advisory lock remains execution ownership authority. Use fake transport until policy-approved dispatch is integrated; trusted supervisor trial context controls phase transitions and rejects caller attempts to self-assign another phase. — Depends: T009, T003.

\- [X] T011 [P] Write tests/unit/scope.test.ts and tests/unit/headers.test.ts for origin/effective port, decoded path segments, dot/encoded/double-encoded escapes, userinfo/fragments/backslashes, reserved headers, extracted absolute URLs, address sets and operation exclusions; include intentional local/private approvals and /api versus /apix cases (FR-004/023/027). Test exploration in exploration allowed, reset in reset allowed, inspection in baseline allowed; reset or baseline control in exploration rejected; exploration in unauthorized control phase rejected unless the frozen policy explicitly permits that use; excluded operation rejected in every phase; forged phase input cannot grant authority; hallucinated operation rejected. Repeat journey-operation permissions in replay/minimization/artifact phases, with reset/check permissions limited to their actual control phases. — Depends: T005.

\- [X] T012 Implement src/engine/policy/scope.ts, operations.ts, headers.ts and src/server/scope-preview\.ts with bounded DNS lookup, normalized IPv4/IPv6 addresses, 60-second hash-bound approval, mutation acknowledgment and frozen operation set; no redirects/proxies or server-entry routing. Preserve original path before normalization; pass scopetests. Freeze and hash the single phase-aware operation policy at approval, exposing all four categories and explicit phase permissions for developer inspection. Replay/minimization/artifact journey actions use the frozen journey-operation permissions; their reset/check subphases retain control-only permissions. No second authorization system; hiding controls from Gemini is not enforcement. — Depends: T011, T010.

\- [X] T013 [P] Write tests/unit/secrets.test.ts and tests/integration/credentials.test.ts for FR-018 default/developer sensitive selectors, taint, symbolic equality, URL/JSON echoes, unexpected response secrets, withheld unsafe content, encryption/AAD/key failure, replacement/deletion and zero raw secret in provider/DB/log/export captures (SC-006/012). Require repeated encryption of identical plaintext to produce distinct 96-bit nonces/ciphertexts; valid key/nonce/AAD/ciphertext/tag decrypt correctly. Tampered project identity, credential slot/name or version in AAD, ciphertext or authentication tag must fail closed. Reject malformed/incorrectly sized keys; authentication failure never returns plaintext/partial data or leaks through logs, traces, errors, findings or model input. — Depends: T006, T005.

\- [X] T014 Implement src/server/credential-store.ts and src/engine/secrets/vault.ts, classify.ts, sanitize.ts using AES-256-GCM/fresh nonce/AAD and separate key, encrypted project slots, trial-only issued secrets, symbolic bindings and sanitization before every sink. Missing/wrong key fails closed; discard vault on trial termination; pass secrettests and document unmarked-secret/memory-erasure limits. — Depends: T013, T003.

\- [X] T015 Write tests/unit/transport.test.ts with local HTTP/TLS test servers in tests/helpers/target-server.ts; cover pinned socket address, hostname/Host/SNI/certificate validity, no Location follow, no address fallback, reserved headers, deadline abort, cancellation, 1MiB bodies/16KiB headers, identity encoding and compression rejection. No live/staging target requests; require failure before transport implementation. — Depends: T012, T014, T010.

\- [X] T016 Implement src/engine/execution/http-executor.ts and src/server/dispatch.ts using native http/https, agent:false, custom pinned lookup and verified socket peer. Route every target intent through RunSupervisor → BudgetManager → frozen ScopePolicy/operation policy → final cancellation check → executor. Persist intent/counter then recheck gate after awaits; no await between final check and socket creation. Pass transporttests; worker/phase modules cannot import target transport. Before the first possible target socket, extend existing src/server/repositories/runs.ts for atomic persisted intent plus conservative BudgetManager consumption, and dispatch outcomes sufficient for uncertain-response crash recovery. Database failure forbids dispatch; uncertain consumption is never refunded. Independently authorize operation classification against frozen policy and actual supervisor-controlled phase/trial context; reject forged phase tags. Recheck this same authorization after persistence with the final cancellation gate; caller phase fields confer no authority. Pass early crash/duplicate-supervisor tests as well as transport tests. — Depends: T015.



**## Phase 3 — User Story 1 (P1): E–L, configure and autonomously explore**



**\*\*Goal\*\***: Produce the first live-model controlled-fixture workflow whose predefined

state-consistency invariant is deterministically evaluated as violated.



**\*\*Independent verification / checkpoint\*\***: A developer/CLI imports the neutral fixture, approves scope/reset/invariant, and live Gemini generates a valid dependent journey whose observed violation is recorded without a supplied trigger sequence.





**### E: OpenAPI pipeline — US1**



**\*\*Goal\*\***: Map supported documents without loading external references.



**\*\*Independent verification / checkpoint\*\***: JSON/YAML × 3.0/3.1 compatibility matrix passes, with explicit per-operation exclusions.



\- [X] T017 [US1] Write tests/contract/openapi.test.ts and tests/fixtures/openapi/ cases for both versions/formats, duplicate keys/tags/aliases, internal/unresolved/remote/file refs, recursion, nullable differences, multiple servers, unsupported composition/serialization and limits. Intercept external I/O and assert zero fetch/file loading; unaffected eligible operations survive exclusions (FR-002/028, AP-010). — Depends: T016, T005.

\- [X] T018 [US1] Implement src/engine/openapi/parse.ts and references.ts around @scalar/openapi-parser and yaml 2 with in-memory/no-loader use, bounded worker parsing, internal-reference graph and structural/local diagnostic partition. Reject invalid document globally; report affected-operation exclusions, no automatic repair/upgrade. Lock release only after parsercases pass. — Depends: T017.

\- [X] T019 [US1] Implement src/engine/openapi/profile.ts, schemas.ts and model.ts using Ajv 8 separate 3.0/3.1 instances, explicit nullable normalization, allowed formats/bounds and stable method/path IDs. Validate generated/runtime inputs without coercion or remote schema loading; persist sanitized snapshot via src/server/repositories/specifications.ts. Pass tests/unit/api-model.test.ts against FR-002/028 generation profile; zero eligible operations prevents run. — Depends: T018, T014, T006.



**\*\*Implementation checkpoint\*\***: T001–T030 are verified complete. GATE 1 — SAFE EXECUTION READY passes: 305 tests passed, zero failed/skipped; full typecheck, lint, formatting and production build pass. Controlled faulty/repaired fixture execution uses independently verified fresh baselines and the sole supervised dispatcher. Preserved OpenAPI schemas/internal reference closure retain Ajv-authoritative 3.1 sibling semantics; historical blocker resolution remains in \`tests/acceptance/gate1-parser-blocker.md\`. Dedicated Gate 1 evidence and limitations are recorded in \`tests/acceptance/gate1.md\`. Gate 2 provider/context and adaptive engine composition are complete through T033; T034 acceptance is backed by a full 428-test pass. T035 was attempted live and failed MODEL ERROR before target dispatch; it remains unchecked. See \`tests/acceptance/vertical-slice.md\`. Dependent acceptance work is blocked.



**### F: Deterministic value flow — US1**



**\*\*Goal\*\***: Resolve fresh typed values without guessed identifiers.



**\*\*Independent verification / checkpoint\*\***: Extraction/interpolation/dependency tests distinguish missing values, absent fields and sensitive values.



\- [X] T020 [US1] Write tests/unit/variables.test.ts for configured slots, fresh email/UUID/bounded values, JSON Pointer/header/status sources, explicit path/query/header/body bindings, null/types, prototype keys, backward refs, taint and per-trial freshness. Missing IDs cannot be invented; no regex/script/string evaluation (FR-024). — Depends: T019.

\- [X] T021 [US1] Implement src/engine/execution/variables.ts, generate.ts, bindings.ts and src/engine/validation/dependencies.ts; keep values in trial memory, persist declarations/symbols only, enforce schema bounds and source order. Pass valuetests; runtime missing/type-invalid values yield EXECUTION ERROR without the dependent request. — Depends: T020.



**### G: Predicate engine — US1**



**\*\*Goal\*\***: Evaluate immutable assertion semantics and eligibility deterministically.



**\*\*Independent verification / checkpoint\*\***: Every operator and all four outcomes pass without model verdicts.



\- [X] T022 [US1] Write tests/unit/predicates.test.ts and tests/contract/predicate-provenance.test.ts for typed equals/not-equals/in/exists/absent, conjunction, applicability, UNEVALUABLE precedence, NOT APPLICABLE, symbolic secret comparisons, immutable identity/hash and source approval. Required missing/truncated steps never become a pass (FR-007). — Depends: T021.

\- [X] T023 [US1] Implement src/engine/detection/predicate.ts, src/engine/validation/predicate.ts and src/server/repositories/predicates.ts; preserve ID/version/hash across stages, source and append-only approval, no executable code or prose-derived specification authority. Pass predicatetests; edits create new versions. — Depends: T022.



**### H: Password-reset fixture — US1**



**\*\*Goal\*\***: Provide the smallest real workflow target with faulty/repaired behavior.



**\*\*Independent verification / checkpoint\*\***: Same neutral contract serves both variants; reset/check and sensitive token acquisition fit the supported profile.



\- [X] T024 [US1] Write tests/integration/account-fixture.test.ts and fixtures/private/account-acceptance.json for old-token rejection after both email and password changes, reset-empty baseline and neutral public-contract equality between variants. Keep trigger/variant metadata outside planner context; HTTP token fields replace email interception. Verify neutral public contracts and configured phase policy classify reset/baseline controls separately; control operations cannot become exploration candidates. — Depends: T023.

\- [X] T025 [US1] Implement fixtures/api/server.ts, account.ts, control.ts and openapi/account.json with in-memory account/reset-token state, faulty/fixed flag evaluator-only, deterministic POST reset and GET baseline, neutral operations and sensitive token responses. Add package.json fixture script; pass fixturetests and parser profile checks. Configure fixture reset and inspection operations for their control-only phases in the frozen policy; keep them out of planner exploration input while retaining dispatcher enforcement. — Depends: T024.



**### I: Fresh-state manager — US1**



**\*\*Goal\*\***: Admit full trials and bind verified baseline evidence to one trial.



**\*\*Independent verification / checkpoint\*\***: All trial types reject stale, partial, unevaluable or insufficient-budget setup before journey dispatch.



\- [X] T026 [US1] Write tests/integration/fresh-state.test.ts for reset statuses/assertions, required nonempty baseline, unique trial ID, no baseline reuse, partial reset, timeout, interference and short-by-one budget. Cover exploration/replay/minimization/artifact phase tags and no cleanup after stop (FR-021/AP-008). — Depends: T025, T016.

\- [X] T027 [US1] Implement src/engine/fresh-state/manager.ts and trial.ts to admit finite reset/check/journey count before reset, execute reset/check intents through the sole supervisor dispatcher, evaluate baseline and produce BaselineEvidence. Stop BASELINE ERROR/BUDGET EXHAUSTED as specified; pass baselinetests. Trial assertions are local, check HTTP requests are charged. Enter reset, baseline and admitted trial phases through trusted RunSupervisor-controlled context; submitted phase tags cannot advance it. All nested requests retain the same dispatcher and frozen phase-aware operation policy. — Depends: T026.



**### J: Sequential journey executor — US1**



**\*\*Goal\*\***: Execute validated steps and persist sanitized evidence.



**\*\*Independent verification / checkpoint\*\***: Real fixture execution records intent before dispatch, fresh extractions and safe failures.



\- [X] T028 [US1] Write tests/integration/journey-execution.test.ts for operation lookup/schema rejection, static/journey auth override, dependent values, valid 401/403 investigation versus unexpected rejection, 429, missing values, bounded bodies, cancellation and storage failure; assert sequential single dispatch and no mutation retry. Reject reset/baseline control operations and forged phase inputs in proposed exploration journeys; test hallucinated and excluded operation rejection independently of planner filtering. — Depends: T027, T021.

\- [X] T029 [US1] Implement src/engine/validation/journey.ts and src/engine/execution/journey.ts, requests.ts, auth.ts integrating approved operation resolution, bindings/input checks, supervisor intent client, vault and extraction. Revalidate after substitution and preserve predicate step IDs. Pass journeytests with the only target transport in src/server/dispatch.ts. Validate journey operations against the frozen journey-phase permissions; request intents cannot choose execution phase. Supervisor authorization remains decisive even after worker validation. — Depends: T028.

\- [X] T030 [US1] Implement src/engine/observations/store.ts, summarize.ts and src/server/repositories/runs.ts, evidence.ts, journeys.ts with tests/integration/evidence-store.test.ts; preserve "Append-only", "Intent consumes budget before dispatch", "No raw body/header/token columns" and immutable snapshots. Redact before persistence/provider; DB failure stops; restart marks interrupted without re-execution (FR-010/017/018). EXTEND the early runs.ts persistence established in T010/T016 for observations, traces, journeys, evidence retrieval and product-facing queries; integrate later finding retrieval with the planned findings repository. This task does not introduce first durable run/dispatch records, replace the sole budget owner or postpone crash safety. — Depends: T029, T006.



**\*\*GATE 1 — SAFE EXECUTION READY (after T030)\*\***: Core contracts, early durable persistence, budget,

supervisor, phase-aware policy, secrets, OpenAPI pipeline, fresh-state manager and sequential

executor pass controlled-target tests. Before this gate, only bounded test harness targets are

used to establish these capabilities; no arbitrary developer/staging run is enabled.



**### K: Gemini provider and planner — US1**



**\*\*Goal\*\***: One bounded model proposal per round, with no execution authority.



**\*\*Independent verification / checkpoint\*\***: Mocked provider cannot leak secrets, authorize dispatch or bypass deterministic plan rejection.



\- [X] T031 [US1] Write tests/contract/provider.test.ts and tests/unit/planner.test.ts for valid structured proposals, malformed/oversized output, hallucinated operation/parameter, invalid binding, prompt injection, provider timeout/refusal/429, immediate invalid-plan stop and three valid duplicate/non-useful rounds. Assert zero raw secrets or private fixture metadata in captured input. Capture planner inputs and assert only exploration-eligible operations appear: no reset/baseline control candidates or private seeds. Hallucinated controls and forged phase fields must fail deterministic validation without dispatch. — Depends: T030.

**\*\*T031/T032 verification checkpoint\*\***: The two authorized predicate-fixture corrections preserve the positive assertions; ID/version/hash mismatch cases reject MODEL PLAN ERROR. All 64 provider/planner/adapter boundary tests pass. Full suite: 369 passed, zero failed/skipped, including all 305 unchanged Gate 1 tests. Typecheck, full lint and formatting pass. See \`tests/acceptance/t031.md\` and \`tests/acceptance/t032.md\`. No live Gemini call has occurred. T033 is verified separately below.



\- [X] T032 [US1] Implement src/engine/planning/provider.ts, gemini.ts and context.ts using @google/genai, explicit recorded model/configuration, structured schema, no tools, retries attempts:1 and <=30s/shared deadline. Apply strict Zod and deterministic journey policy after output; bounded symbolic context only; usage fallback from FR-029. Pass modeltests; never infer free-tier availability. Filter API/mapping context to exploration-eligible operations; exclude control definitions as exploration candidates. Treat filtering as context reduction only: strict validation and authoritative supervisor phase-policy checks remain mandatory. — Depends: T031.

\- [X] T033 [US1] Implement src/engine/mapping/state.ts and src/engine/session/explore.ts with one proposal call combining rationale/mapping/journey, four provenance kinds, bounded sanitized observation feedback and normalized novelty. Supervisor owns counters; stop deterministic errors/stagnation, no waiting approval loop. Pass tests/unit/agent-loop.test.ts and provenance assertions (FR-003/008/011/019/026). Request exploration through supervisor-controlled trial context; model output cannot set phase or operation classification. — Depends: T032, T023.



**### L: Controlled autonomous vertical-slice gate — US1**



**\*\*Goal\*\***: Demonstrate that a real model can construct a multi-step workflow against

a repository-owned test fixture and that deterministic code can detect a

predefined state-consistency violation.



**\*\*Independent verification / checkpoint\*\***: Actual Gemini run reaches OBSERVED VIOLATION from a fresh baseline and approved invariant; failures stop broader work until fixed.



\- [X] T034 [US1] Implement initial candidate detection in src/engine/detection/candidates.ts and a minimal src/cli/vertical-slice.ts entry using repositories/supervisor scope approval. Write tests/integration/suspicious.test.ts proving initial VIOLATED produces OBSERVED VIOLATION without any model classification or hidden trigger input. — Depends: T033, T030.

\- [X] T035 [US1] Implement and execute a controlled order-lifecycle acceptance fixture via
src/cli/vertical-slice.ts and record sanitized model/version/journey/baseline/
predicate evidence in tests/acceptance/vertical-slice.md.

Create the Gate 2 fixture only in new T035-owned files, for example
fixtures/api/order-lifecycle.ts, openapi/order-lifecycle.json and
fixtures/private/order-lifecycle-acceptance.json. Do not modify or depend on the
T024/T025 account fixture for this gate. The target MUST be this repository-owned
local fixture. No external, third-party, production, staging or user-supplied
target is permitted.

The public fixture models an ordinary order state machine with operations such as
create order, cancel order, inspect order and request fulfillment. The intentionally
inconsistent variant permits a cancelled order to become FULFILLED; the repaired
variant rejects that transition. The approved developer invariant is:
"an order observed as CANCELLED must not later be observed as FULFILLED within
the same fresh trial." Variant/trigger metadata remains evaluator-private and is
not supplied to Gemini.

Require:
1\. actual configured Gemini proposal rather than a canned/mock journey;
2\. a valid multi-step journey produced without supplying the expected sequence;
3\. execution exclusively against the new repository-owned order-lifecycle fixture;
4\. a fresh deterministic baseline is established before journey execution;
5\. deterministic predicate evaluation reaches VIOLATED for the intentionally
   inconsistent fixture;
6\. candidate classification records OBSERVED VIOLATION as the engine's internal
   regression-testing state;
7\. no scope, budget or dispatcher-policy violations;
8\. sanitized acceptance evidence is recorded in
   tests/acceptance/vertical-slice.md.

If the existing generic predicate/value contract cannot express the ordered
state-transition invariant, implement the smallest reusable declarative extension
based only on authoritative execution records. It must contain no order-specific
engine logic and no arbitrary code evaluation.

If the gate fails, record the failure and stop dependent acceptance work.
This is GATE 2 — AUTONOMOUS CONTROLLED STATE-WORKFLOW PROVEN.

T035 acceptance checkpoint (2026-10-01): PASSED on the new order-lifecycle fixture. Real configured Gemini autonomously proposed a three-step journey; a new verified baseline preceded execution; deterministic same-order/ordered-state evaluation produced VIOLATED and OBSERVED VIOLATION. Five supervised requests, one model call. Evidence: tests/acceptance/vertical-slice.md and vertical-slice-order-passed.json. Historical T001–T034 task definitions are unchanged in this implementation pass. T036 has not begun.

— Depends: T034.



**## Phase 4 — User Story 2 (P1): M–O, reproduce and export**



**\*\*Goal\*\***: Extend the proven discovery slice through confirmation, minimization and artifact output.



**\*\*Independent verification / checkpoint\*\***: A recorded candidate independently confirms or fails honestly, reduces redundant steps and exports a reproducible verified manifest.





**### M: Independent verification — US2**



**\*\*Goal\*\***: Confirm only eligible same-predicate fresh replay evidence.



**\*\*Independent verification / checkpoint\*\***: Controlled faulty/fixed/unevaluable replays exercise all finding classifications separately from execution outcomes.



\- [x] T036 [US2] Write tests/unit/finding-transitions.test.ts and tests/integration/verification.test.ts for the T035 order-lifecycle candidate: eligible versus hypothesis-only predicates, fresh replay, same version/hash, SATISFIED/VIOLATED/NOT APPLICABLE/UNEVALUABLE, budget/baseline errors, late approval/new run, edits/new candidate and later inconsistent evidence (FR-012/AP-011). — Depends: T035.

\- [x] T037 [US2] Implement src/engine/detection/findings.ts, src/engine/verification/replay.ts and src/server/repositories/findings.ts with append-only transitions and consistency flag. Initial+fresh eligible VIOLATED yields CONFIRMED; applicable SATISFIED yields NON-REPRODUCED; missing verdict/approval yields INCONCLUSIVE. EXECUTION ERROR stays step/run-only. Pass findingtests through the same dispatch path. Extend src/cli/vertical-slice.ts to replay the live T035 order-lifecycle candidate independently from a newly verified baseline with the same eligible predicate; record both evidence references in tests/acceptance/vertical-slice.md. GATE 3 — CONFIRMATION PROVEN must pass before minimization development; model explanations alone cannot satisfy it. — Depends: T036.



**### N: Minimization — US2**



**\*\*Goal\*\***: Retain shortest verified sequence found by bounded dependency-preserving deletion.



**\*\*Independent verification / checkpoint\*\***: Six-step controlled journey reduces redundant steps while preserving predicate identity and fresh dependencies.



\- [x] T038 [US2] Write tests/unit/minimizer.test.ts and tests/integration/minimization.test.ts for a six-step order-lifecycle journey with two independent reads, producer/predicate-step deletion rejection, same predicate, all-phase budget, failed reset, cancellation and local stopping criteria. A supplied redundant case is not discovery evidence (FR-013/SC-004). — Depends: T037.

\- [x] T039 [US2] Implement src/engine/minimization/greedy.ts with ordered single-step deletions, dependency/predicate preservation, finite candidate/visited scans and fresh admitted trial per valid candidate. Accept only exact VIOLATED; retain verified best and stop reason. Pass minimizertests; no global-minimum claim and no phase-local dispatch counters. — Depends: T038.



**### O: Reports and regression artifacts — US2**



**\*\*Goal\*\***: Generate secret-free reproducible exports, with supervised-path VERIFIED status only.



**\*\*Independent verification / checkpoint\*\***: Exact manifest verification shares originating run authority; independent runner cannot update its evidence.



\- [x] T040 [US2] Write tests/contract/artifact.test.ts and tests/integration/artifact-authority.test.ts for manifests/hashes/credential slots, immutable predicates/reset, supervised verification budget/cancel/lock loss, GENERATED/UNVERIFIED/VERIFIED and independent invocation scope. No second worker/runner dispatch during originating run and no independent result granting VERIFIED. — Depends: T039.

\- [x] T041 [US2] Implement src/engine/exports/report.ts and manifest.ts for Markdown/JSON evidence reports and exact executable manifest with reset/journey/predicate/assertions/symbolic slots and hash/version. Report approval provenance, original/best lengths, baseline/replay evidence, truncation and local stop honestly; pass artifacttests and secret scans (FR-014/015/025). — Depends: T040.

\- [x] T042 [US2] Implement src/engine/exports/verify.ts to interpret exact exported manifest through existing engine intents and RunSupervisor → BudgetManager → frozen policy → cancellation → executor, with remaining originating budget. Record supervised provenance and grant VERIFIED only on intended failing assertion; no copied counter or second dispatch worker. Pass artifact-authority tests including persistence/cancel races. — Depends: T041.

\- [x] T043 [US2] Implement src/engine/exports/runner.ts, bundle.ts and src/cli/regression.ts with esbuild fixed offline .mjs bundle. Require every invocation explicit target/address/operation approval, mutation acknowledgment, finite independent budget and protected credential injection; preserve manifest operation/path expectations. No Gemini/DB/original-run write authority; tests/integration/standalone-runner.test.ts validates faulty failure versus repaired pass and zero evidence mutation. — Depends: T042.

\- [x] T044 [US2] Extend src/cli/vertical-slice.ts and tests/acceptance/vertical-slice.md to record the live T035 order-lifecycle candidate → independent CONFIRMED → best verified sequence → Markdown/JSON → manifest supervised verification and standalone package. Verify exact ID/hash/fresh values and one shared request budget. Gate must pass before remaining fixtures/UI; no global minimality or discovery-rate claim. This is GATE 4 — REPRODUCTION PIPELINE PROVEN. — Depends: T043.



**## Phase 5 — P/S: Required fixtures, benchmark and engine acceptance**



**\*\*Goal\*\***: Validate the central hypothesis before broad product UI investment.



**\*\*Independent verification / checkpoint\*\***: ENGINE MVP ACCEPTANCE GATE must pass; failure blocks product UI. UI-dependent criteria are deferred to Phase 6.



**### Required benchmark fixtures**



\- [x] T045 Implement the remaining required benchmark fixtures in fixtures/api/inventory.ts and workflow.ts with openapi/inventory.json and workflow.json, evaluator-private fixtures/private/required-suite.json and tests/integration/required-fixtures.test.ts. Reuse the T035 order-lifecycle fixture as one required fixture. Add two non-authentication state-consistency cases: inventory allocation after an item becomes unavailable, and publication after a document is archived. Each fixture has deterministic reset/inspection, intentionally inconsistent/repaired variants and neutral public contracts. Keep evaluator labels/triggers out of planner input. Use the same inspected phase-aware control/journey operation categories as the T035 fixture; verify planner context excludes control candidates. — Depends: T044.



**### Required benchmark harness and artifact acceptance**



\- [x] T046 Implement src/cli/benchmark.ts, tests/benchmark/harness.test.ts and package.json benchmark/test:artifacts scripts for five fresh trials per required faulty/fixed variant, blinded inputs and separate redundant-journey acceptance. Freeze engine/prompt/dependency/model/fixture/config hashes; failed trials remain in denominator. Capture FR-029 journeys/model calls/token estimates or unknowns/phase requests/original-best lengths. Required execution never depends on supplemental fixtures; supplemental selection is available only when that optional suite exists. Pass harness tests before live benchmark execution — Depends: T045.

\- [x] T047 Run paired independent runner acceptance and supervised manifest verification via tests/integration/artifact-acceptance.test.ts and tests/acceptance/artifacts.md: three clean faulty/fixed executions per required fixture, own finite approved acceptance budgets. Intended assertion must fail on faulty/pass on repaired; crash not success, independent results never grant supervised VERIFIED or alter original run. — Depends: T046.



**### ENGINE MVP ACCEPTANCE GATE**



\- [ ] T048 Execute and record ENGINE MVP ACCEPTANCE GATE (GATE 5 — ENGINE MVP ACCEPTED) in tests/acceptance/results.md and tests/acceptance/benchmark.json before application/product UI work. Run 30 required discovery trials with actual configured Gemini and frozen accepted configuration, without changing GhostQA behavior during execution. Each required faulty fixture must achieve SC-002 >=4/5 discoveries AND confirmations; each repaired fixture must have zero repaired-invariant confirmations. Require required faulty/repaired fixtures plus core engine AP-002/003/008/010/011 and engine-level AP-004/005/009 checks, confirmation/minimization/report/artifact generation/supervised verification and paired runner acceptance to pass. Record separate rates, failed-trial denominators, metrics and evidence. STOP broad UI if any engine threshold/check fails; fixes require a new recorded frozen build/series. Defer UI/API-dependent acceptance portions, SC-001/007/008 and visible UI cancellation to product acceptance; these are not prerequisites for UI development — Depends: T047.



**## Phase 6 — Q/R: Application APIs, product UI and product acceptance**



**\*\*Goal\*\***: Build minimal product surfaces only after the engine gate; then measure UI-dependent acceptance.



**### Q: Durable application APIs**



\- [ ] T049 [US1] Write tests/contract/application-api.test.ts for projects/import/credentials/predicate approval/reset/scope/start and sanitized error envelopes in application-api.md. Include local Host/Origin/anti-CSRF rules, missing approval, expired preview, busy run, invalid content and no raw credential response. — Depends: T048.

\- [ ] T050 [US1] Implement src/server/api-guards.ts and src/app/api/projects/route.ts, [id]/route.ts, [id]/specifications/route.ts, [id]/credentials/[slot]/route.ts, [id]/predicates/route.ts, [id]/reset/route.ts, [id]/scope-preview/route.ts and [id]/runs/route.ts; add predicate approval route. Use existing repositories and supervisor only, not a route-owned loop; pass apitests, FR-001 encryption/replacement/deletion cases and AP-001/005. Expose all frozen operation categories and permitted phases during scope preview/approval; clients cannot authorize phase by submitting fields. — Depends: T049.

\- [ ] T051 [US2] Implement src/app/api/runs/[id]/findings/route.ts, src/app/api/findings/[id]/route.ts, exports/[artifactId]/route.ts and verification-runs/route.ts with tests/contract/finding-api.test.ts. Expose evidence/consistency/local reduction/artifact statuses and late-approval new bounded run; never resume old run or leak raw secrets. — Depends: T050.

\- [ ] T052 [US3] Write tests/integration/run-control-api.test.ts for polled progress, cancellation ACK, cursor pagination, crash/restart inspection, persisted dispatch intent and rejected duplicate run/active-project deletion; closure must apply to every phase including artifact verification (FR-016/017/023). — Depends: T051.

\- [ ] T053 [US3] Implement src/app/api/runs/[id]/route.ts and cancel/route.ts with src/server/repositories/read-models.ts; durable polling reads sanitized persisted events, no hidden counters. Verify controltests and 500ms poll compatibility, lock-loss/shutdown stop and history inspectability without team/auth features. — Depends: T052.



**### R: Minimal product UI and participant/usability/accessibility acceptance**



\- [ ] T054 [US1] Implement src/app/projects/page.tsx, projects/[id]/page.tsx and src/components/project-setup.tsx, endpoint-explorer.tsx, run-config.tsx for project/import/exclusions/reset/assertions/credentials/finite limits/scope approval. Use Tailwind charcoal inspiration from DESIGN.md adapted to PRODUCT.md, system sans/mono and text statuses. Verify AP-001 setup cases; no proprietary Spotify assets or chat. Broad UI starts only after ENGINE MVP ACCEPTANCE GATE passes; show exploration/reset/baseline/excluded categories for pre-run developer inspection. — Depends: T053.

\- [ ] T055 [US2] Implement src/app/findings/[id]/page.tsx and src/components/finding-detail.tsx, reproduction.tsx, artifact-export.tsx; show source/approval, expected/observed, independent evidence, original/best steps, local stop and separate verification/consistency states. Verify faulty/fixed report reading and secret-free downloads (AP-006). — Depends: T054.

\- [ ] T056 [US3] Implement src/app/runs/[id]/page.tsx and src/components/session.tsx, journey-trace.tsx, use-run-polling.ts with 500ms active polling, phase/budget/stop reason, cancellation and persisted structured rationale/observations/findings. Stop polling terminal runs and inspect interrupted histories; no model-owned status/counter (FR-016/022). — Depends: T055.

\- [ ] T057 [US3] Perform keyboard/mobile functional review using tests/acceptance/ui.md at 1280px/375px: setup, cancellation, trace/detail/export, visible focus and non-color status. Fix scoped defects in src/components/ and src/app/; record AP-007, cancellation within two seconds and AP-001/006 participant results where specified. No browser automation/visual-testing framework or final polish. Complete remaining API/UI-dependent AP-001–011 and SC-001–013 acceptance in tests/acceptance/results.md by combining these product results with the frozen engine gate evidence; measure SC-001/007 participant thresholds and SC-008 keyboard/mobile after UI exists. No UI criterion blocks starting UI implementation. — Depends: T056.



**## Supplemental branch — non-critical experimental fixtures**



Optional after the core engine proof. This task is not a prerequisite for the required benchmark, engine acceptance, application APIs, UI or product completion. Skip it in the default critical-path sequence; execute later when additional experiments are desired. Its suite never changes SC-002 denominators.



\- [ ] T058 Optional supplemental branch: implement fixtures/api/shipment.ts, reservation.ts and matching neutral OpenAPI with fixtures/private/supplemental-suite.json and tests/integration/supplemental-fixtures.test.ts. Cover non-authentication state-machine inconsistencies such as delivery after shipment cancellation and confirmation after reservation expiry. Keep these pairs separate from the SC-002 denominator; no idempotency addition or new product scope. — Depends: T044.



**## Phase 7 — T: Final hardening and documentation handoff**



**\*\*Goal\*\***: Close failure-path defects and complete GATE 6 — PRODUCT ACCEPTANCE.



\- [ ] T059 [P] Extend tests/contract/openapi.test.ts, tests/unit/variables.test.ts and tests/integration/response-limits.test.ts for huge/malformed/Unicode/duplicate YAML/recursive documents, invalid JSON/HTML, truncated assertions and oversized bodies/headers/model output. Fix src/engine/openapi/ and execution/ only as needed; preserve supported profile and no invented values. Every defect gets regression. — Depends: T057.

\- [ ] T060 [P] Extend tests/integration/dispatch-authority.test.ts and supervisor.test.ts for cancel during DB await/all six phases, advisory-lock loss, shutdown, duplicate process, crash intents, SSRF/path/header/DNS/redirect attacks and budget exhaustion. Assert sole dispatcher, no second worker authority, no shadow counters and zero post-ACK dispatch; fix src/server/dispatch.ts/run-supervisor.ts as needed. Repeat phase-aware permission matrix and forged-phase tests at the actual authoritative dispatcher: reset/baseline controls never execute as exploration; excluded/hallucinated operations never dispatch, regardless of submitted phase. — Depends: T057.

\- [ ] T061 [P] Extend tests/integration/model-secret-boundary.test.ts for prompt-injection-like OpenAPI/responses, unexpected token echoes, Gemini outage/429/timeout, hallucinated input and stagnation; scan every sink and export. Fix planning/secrets modules without raw-secret model fallback or recovery retries; every defect gets regression. — Depends: T057.

\- [ ] T062 Rerun only affected checks after fixes, then the frozen acceptance suite under a new explicitly recorded build if code changed; retain earlier failed benchmark records. Update tests/acceptance/results.md, README.md and spec feature quickstart.md to actual commands/limitations. Verify constitution compliance and all required outcomes before claiming MVP complete; no unsolicited final polish or excluded infrastructure. GATE 6 — PRODUCT ACCEPTANCE requires product UI, AP-001/006/007 participant/usability/keyboard/mobile checks, final hardening and all accepted outcomes. Reconcile historical FastAPI/pending-decision text in PRODUCT.md with the accepted technical plan during this existing documentation task; that historical cleanup is not a prerequisite for engine implementation readiness. Supplemental experiments are non-blocking and reported separately when performed. — Depends: T059, T060, T061.



**## Dependencies & execution order**



\`\`\`mermaid

flowchart LR

&#x20; A[Foundation and controlled execution] --> G1[GATE 1: SAFE EXECUTION READY]

&#x20; G1 --> G2[GATE 2: AUTONOMOUS DISCOVERY PROVEN]

&#x20; G2 --> G3[GATE 3: CONFIRMATION PROVEN]

&#x20; G3 --> G4[GATE 4: REPRODUCTION PIPELINE PROVEN]

&#x20; G4 --> P[Required fixtures]

&#x20; P --> S[Required benchmark and engine acceptance]

&#x20; S --> G5[GATE 5: ENGINE MVP ACCEPTED]

&#x20; G5 --> Q[Application APIs]

&#x20; Q --> R[Product UI and participant acceptance]

&#x20; R --> T[Final hardening]

&#x20; T --> G6[GATE 6: PRODUCT ACCEPTANCE]

&#x20; G4 -. optional non-critical branch .-> X[Supplemental fixtures T058]

\`\`\`



T010 establishes durable runs/snapshots/recovery in runs.ts; T016 adds atomic intent/consumption

and outcome persistence before any target dispatch. T030 extends that existing layer. Phase Q

completes user-facing APIs, not first crash-safe persistence. Fresh-state admission occurs BEFORE reset; baseline is verified

BEFORE trial execution. These orders follow the accepted contract even where phase descriptions

illustrate the lifecycle informally. US2 depends on US1's live gate but can be independently tested

with recorded controlled candidates; US3 depends on shared authority/persistence and can be tested

with a delayed fixture without Gemini or discoveries. The full usable product includes all three

stories; do not confuse the Phase L engine milestone with completed UI acceptance.



**## Parallel opportunities by story**



Parallel work is optional, not agent delegation. All prerequisites must already be complete.



\- Foundation: scope test authoring and secret test authoring use separate files; do not overlap

&#x20; package/migration/supervisor edits. [P] marks those isolated test tasks.

\- US1: after schemas/API model, variable and predicate fixture case authoring can be separated

&#x20; from UI-free provider test-case authoring; retain explicit task prerequisites and module gates.

&#x20; Parser/executor/provider implementation is sequential for solo progress, so no [P] claim is made.

\- US2: after verification, minimizer example data and report-format acceptance expectations can

&#x20; be reviewed independently; artifact authority tests still depend on the minimizer milestone.

&#x20; No parallel target dispatch/second worker is allowed.

\- US3: once its control API exists, keyboard acceptance documentation can be prepared independently

&#x20; of UI component implementation; acceptance execution waits for its UI dependencies.

\- Final hardening: input/response, authority-race and model/secret regression groups are [P]; they

&#x20; touch distinct test/module files. Final acceptance joins all three. Coordinate shared fixes.



**## Implementation strategy**



Start with setup/foundation, then execute only the controlled order-lifecycle discovery slice at Phase L.

Stop until the actual model produces a valid dependent state-transition journey and deterministic observed violation.

Immediately follow with Phase M–O confirmation/minimization/manifest/export; this is the first

convincing proof. Complete required fixtures and frozen engine benchmark acceptance next. Start

application/product UI only after GATE 5 passes. T058 supplemental fixtures are optional,

non-critical and have no downstream required-task dependencies. No final visual

polish, hosted auth/tenancy, browser automation, visual/load/penetration testing products, CI/CD,

GitHub integration, billing, teams, Redis, queues, plugins, shell execution or microservices.



Task completion requires the stated verification, not merely a file existing. Runtime/safety

checks use controlled fixtures; live Gemini gates report unavailable quota honestly. Every

benchmark build/config is frozen; fix failures in a new recorded run rather than tuning the

measured series. Keep custom checklist ownership separate from task checkbox completion.



**## Coverage and completion gates**



\| Requirement group | Task keys / phases | Acceptance |

\| --- | --- | --- |

\| FR-001/017 persistence/project lifecycle | foundation migrations, evidence, Q APIs | AP-001/005/009 |

\| FR-002/028 import/schema/processing limits | E, foundation watchdog, T input hardening | AP-010/009 |

\| FR-003/008/011 planning/provenance | E, K, L | AP-002/010 |

\| FR-004/023/027 network/operation authority | C/D, J, O, T authority hardening | AP-004/009 |

\| FR-005/018 authentication/secrets | D, F, J, O | AP-005/SC-012 |

\| FR-006/009/026 budget/execution/stops | C, I/J/K/O, T | AP-009 |

\| FR-007/012 predicates/findings | G, L/M | AP-011/SC-013 |

\| FR-010/022 observations/inspection | J, Q/R | AP-006/010 |

\| FR-013 minimization | N | AP-003 |

\| FR-014/015/025 reports/artifacts | O, S | AP-003/004/SC-013 |

\| FR-016/020 run control/accessibility | C, Q/R | AP-007/009 |

\| FR-021 fresh-state | I, M/N/O | AP-008/SC-009 |

\| FR-024 deterministic value flow | F/J/M/N/O | AP-010 |

\| FR-029 benchmark metrics | K/S | AP-002 |



Engine-level success criteria are measured before UI at T048; remaining API/UI-dependent

AP-001–011 and SC-001–013 portions are measured at T057 and revisited after Phase T defects.

No discovery-rate or usability threshold is replaced by unit-test success. Required fixtures from T035 onward are order-lifecycle/inventory/workflow;
supplemental non-authentication state-machine outcomes are reported separately.



**\*\*Task totals\*\***: 62 overall; US1 22; US2 11; US3 4; shared 25. All tasks initially unchecked.



**\*\*T033 verification checkpoint\*\***: Adaptive exploration and four-kind state provenance pass 29 tests. Full suite: 398 passed, zero failed/skipped, including all 305 Gate 1 regressions and 64 provider boundary tests. Typecheck, lint and formatting pass. Sanitized planning records and shared supervisor/budget authority are preserved. See \`tests/acceptance/t033.md\`. T034 and later tasks remain unstarted.



**\*\*T034 local verification checkpoint\*\***: Initial deterministic candidate detection and minimal approved-scope CLI composition are complete. User-authorized local-only verification: 236 passed, zero failed/skipped, including 29 new mocked integration tests. Typecheck, lint and formatting pass. No live target/provider/database interaction occurred; guarded SQL and actual fixture execution require network-backed verification before live discovery claims. See \`tests/acceptance/t034.md\`. T035 remains unchecked and was not started.
