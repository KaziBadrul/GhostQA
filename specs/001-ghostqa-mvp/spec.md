# Feature Specification: GhostQA First MVP

**Feature Branch**: Not created; no branch hook is configured.

**Created**: 2026-09-30

**Status**: Draft — second clarification complete; ready for technical planning

**Input**: User description: "Build the first MVP of GhostQA. A developer provides an OpenAPI
specification and a target base URL to autonomously explore unusual multi-step API workflows
and discover state-related application bugs. The developer creates a project and uploads or
pastes the specification." The remaining journey follows the previously confirmed product brief.

## Clarifications

### Session 2026-09-30

- Q: What clean-state mechanism must a developer configure before GhostQA can explore and verify journeys? → A: Require an in-scope HTTP reset sequence with explicit baseline assertions before every exploration journey, confirmation replay, minimization trial, and regression verification; all requests consume run budgets. Partial reset or failed baseline checks stop the run and make affected verification INCONCLUSIVE.

- Q: Which invariant sources and replay evidence should qualify a finding as CONFIRMED? → A: An observed violation plus one independent replay from verified fresh state must violate the same machine-checkable predicate grounded in an explicit specification assertion or developer approval. Agent hypotheses require developer approval; descriptions alone are not executable assertions.

- Q: Should the MVP pin each run to an explicitly approved network destination and operation set, including local targets? → A: Freeze one HTTP(S) origin, normalized base-path boundary, approved resolved addresses, and eligible operation set per run. Allow explicitly approved local/private targets; disable redirects; require mutation acknowledgment. Apply scope and budgets to every phase, and stop scheduling on cancellation.

- Q: Should journeys pass values and authentication through a restricted, declarative binding contract rather than model-generated extraction code? → A: Use typed literals, named per-trial generated values, JSON Pointer response-field extraction, and named response-header extraction. Deterministically validate bindings; support static project headers and explicitly bound journey tokens, without scripts, cookie jars, OAuth negotiation, or automatic renewal. Preserve four state-evidence categories and restrict the model to proposals.

- Q: Should the MVP prove workflow fuzzing against a fixed three-fixture benchmark using bounded exploration and dependency-preserving step deletion? → A: Adopt three faulty/fixed fixture pairs with five fresh trials each, without exposing triggering sequences to the planner; use greedy dependency-preserving single-step deletion, execute exported artifacts to verify them, stop after the first confirmed finding and its follow-up phases, and enforce the specified failure and stagnation stops. Accept a reported OpenAPI subset with internal references only and operation-level exclusions.

- Q: Should GhostQA encrypt persisted project credentials and keep raw secrets out of model inputs entirely? → A: Encrypt persisted project credentials with a separately stored key; keep journey secrets only in trial memory; never send raw secrets to the model. Persist symbolic references and fresh extraction instructions, sanitize all disclosure channels, and withhold unsafe response content.

- Q: Should the MVP express invariants as declarative assertions over named journey steps, using a small fixed set of comparisons? → A: Adopt immutable versioned assertion records with applicability conditions and conjunction-only assertions; operands reference named-step status, JSON fields, headers, bound values, or typed literals. Support equals, not-equals, literal-set membership, exists, and absent; use SATISFIED, VIOLATED, NOT APPLICABLE, and UNEVALUABLE outcomes.

- Q: Should OpenAPI support be limited to a fixed REST/JSON profile that covers all three benchmark fixtures? → A: Support the fixed common 3.0.x/3.1.x JSON/YAML REST profile, internal references, primitive parameters, bounded JSON schemas, and explicit nullable semantics. Exclude composed/conditional/free-form/recursive generation and multipart/form bodies, report affected operations, never fetch remote references, and require all benchmark operations to fit.

- Q: Should GhostQA start a trial only when the remaining request budget covers its complete reset, baseline checks, and journey? → A: Require full-trial request admission, one shared finite request/time budget, dispatch-time accounting including failed requests, and hard deadlines. Invalid plans stop immediately; three valid but duplicate/non-useful rounds cause stagnation. Expected 401/403 remain evidence; execution-blocking unexpected authentication rejection is EXECUTION ERROR.

- Q: Should an independently run regression artifact require explicit target approval and supplied credentials on every invocation? → A: Require fresh destination/address/operation approval, mutation acknowledgment, supplied credentials, and finite limits on every independent invocation; artifacts carry no active authority. Distinguish GENERATED, UNVERIFIED, and VERIFIED with exact-artifact evidence. Paired fixture verification uses separate bounded acceptance runs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and Explore a Project (Priority: P1)

A developer creates a project, uploads or pastes their specification, supplies a reachable local
or staging target, reviews endpoint and inferred-state mapping, configures credentials and run
limits, and starts autonomous exploration. They inspect ordered journeys and observed violations.

**Why this priority**: This is the smallest end-to-end slice that exposes unexpected workflows
and gives developers evidence to investigate.

**Independent Test**: Use a controlled target with related account operations, import its
specification, start a bounded run, and inspect a recorded journey with at least three dependent
steps and a state-related hypothesis. This story can deliver traces before export is available.

**Acceptance Scenarios**:

1. **Given** a valid supported specification, **When** a developer uploads or pastes it and sets
   a base URL, **Then** a saved project shows declared operations separately from inferred
   dependencies and states, with unsupported operations identified.
2. **Given** an invalid specification or target configuration, **When** setup is submitted,
   **Then** actionable errors identify the problem and no exploration begins.
3. **Given** a configured project with credentials and finite limits, **When** a run starts,
   **Then** unusual dependent journeys execute and progress, responses, and observed transitions
   are recorded separately from hypotheses.
4. **Given** observed responses that invalidate a planning assumption, **When** exploration
   continues, **Then** the next journey can adapt and its recorded rationale references those
   observations while respecting the original scope and remaining budgets.

---

### User Story 2 - Reproduce and Export a Finding (Priority: P1)

A developer examines a observed violation, supplies or reviews the expected invariant, and
receives a confirmed finding only after replay verifies it. GhostQA minimizes the sequence and
provides a report and regression test that the developer can run independently.

**Why this priority**: Exploration becomes actionable when a developer can reproduce and fix
an evidenced bug.

**Independent Test**: Start from a recorded candidate on a controlled faulty target. Verify
confirmation, minimization, report export, and a regression test that fails on the faulty target
and passes when the same invariant is repaired.

**Acceptance Scenarios**:

1. **Given** a candidate and an explicit expected invariant, **When** fresh-state replay repeats
   the violation, **Then** the finding becomes confirmed and links observations to that invariant.
2. **Given** an outcome with no reliable invariant or repeatable setup, **When** analysis finishes,
   **Then** it is INCONCLUSIVE and states the missing evidence.
3. **Given** a confirmed sequence containing removable steps, **When** minimization completes,
   **Then** the returned sequence still reproduces the same predicate, retains necessary
   dependencies, and reports what was attempted and why minimization stopped.
4. **Given** a confirmed finding, **When** the developer exports it, **Then** the report and
   regression test include ordered steps, setup instructions, expected versus observed behavior,
   and placeholders for credentials, with no secret values.
5. **Given** a candidate that does not replay, **When** a fresh-state replay completes and evaluates the same predicate without a violation,
   **Then** it is labeled NON-REPRODUCED and its original evidence remains available.

---

### User Story 3 - Control and Review Runs (Priority: P2)

A developer cancels exploration, understands why a run stopped, and returns to saved projects,
traces, and findings without losing completed evidence.

**Why this priority**: Predictable execution and durable records let developers use the tool
on changing local and staging environments.

**Independent Test**: Use a delayed target, cancel a run, reopen the project, and verify that no
new work was scheduled and completed traces remain readable.

**Acceptance Scenarios**:

1. **Given** an active run, **When** cancellation is requested, **Then** no new requests are
   scheduled after cancellation is accepted, and in-flight outcomes are recorded as completed,
   failed, or interrupted without asserting that target-side effects were undone.
2. **Given** a run reaching any configured budget, **When** the limit is reached, **Then** it
   stops scheduling work, reports the exhausted limit, and retains partial results.
3. **Given** saved runs, **When** the developer returns after a service restart, **Then** projects
   and completed evidence remain available and interrupted runs show an explicit terminal status.
4. **Given** keyboard-only operation or a narrow viewport, **When** a developer configures a run
   and reviews findings, **Then** actions, focus, status text, and trace details remain usable.

### Edge Cases

- Invalid documents, unsupported versions, unresolved references, and empty operation sets produce
  specific import feedback. External document references are not fetched automatically.
- Missing credentials, expired credentials, rate limits, connection failures, and timeouts are
  distinguished from application-invariant violations; they never alone confirm a state bug.
- Missing prerequisite values or failed setup steps stop affected journeys rather than silently
  substituting invented identifiers. Runtime binding failure is EXECUTION ERROR and stops the run;
  a reset/setup failure stops as BASELINE ERROR. No automatic continuation or recovery retries.
- Unexpected response formats or large bodies preserve a bounded summary and mark truncation.
- Redirect responses are recorded without following them. Out-of-scope URLs, path-boundary
  escapes, unapproved destinations, and excluded operations are rejected before a request.
- Hostname resolution changes cannot change an active run destination; the developer must
  approve changed addresses in a new run.
- Failed or partially successful reset, or unavailable baseline evidence, stops the run before
  the next trial and makes affected verification INCONCLUSIVE. No trial assumes clean state.
- Model unavailability, malformed plans, or instructions embedded in target content stop or reject
  affected work with a visible reason; they cannot change target scope or limits.
- Zero findings means no confirmed finding within that run, not proof that the target has no bugs.
- Changed specifications or base URLs do not rewrite prior run snapshots or evidence.
- A crash during execution leaves an interrupted run; restart never silently repeats mutations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Developers MUST be able to create, name, reopen, and delete projects; deletion MUST
  disclose that associated records and credentials will be removed and require confirmation.
- **FR-002**: Projects MUST accept OpenAPI 3.0.x/3.1.x JSON or YAML within the following
  fixed REST/JSON profile: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS; primitive path/header
  parameters; primitive query parameters and primitive arrays using form serialization with
  explicit explode true/false; JSON request bodies and JSON response extraction. Path/header
  parameters use simple serialization; other parameter serialization forms are unsupported.
  Generation supports string, integer, number, boolean, declared-property object, and single-item-
  schema array types; required properties, enums, and finite length/count/range constraints.
  Generation MUST enforce declared constraints, including applicable string patterns/formats;
  an unsatisfiable or unsupported constraint blocks the affected operation, never silently
  produces invalid input. OpenAPI 3.0 nullable and 3.1 single-type-plus-null MUST be respected.
  Composed alternatives (oneOf/anyOf/allOf), conditional schemas, unconstrained free-form bodies,
  multipart/form bodies, and recursive schemas are excluded from automated generation.
  Only internal document references may be resolved. Unresolved/remote references and unsupported
  generation constructs MUST block affected operations with specific reasons; remote documents
  MUST NOT be fetched. JSON extraction does not require generating every response schema.
  Import may proceed if eligible operations remain; zero eligible operations prevents a run.
  Developers MUST review exclusions before execution. Specification server entries never select
  destinations. All benchmark operations, token acquisition, reset, and baseline checks MUST fit
  this profile. Finite generation bounds and input validity MUST be reported for each run.
- **FR-003**: Mapping MUST distinguish four provenance categories: OpenAPI-declared facts
  (operations, schemas, and explicit assertions); inferred dependencies (proposed cross-operation
  relationships); hypothesized state (unverified application-state claims); and observed transitions
  (changes supported by recorded step evidence). Each inference or hypothesis MUST retain its
  rationale; observations MUST cite supporting steps. A successful response alone MUST NOT prove
  an unobserved internal state. Declared facts are contract evidence, not proof of runtime behavior.
- **FR-004**: Developers MUST approve one HTTP(S) origin (scheme, hostname, and port), a
  normalized base-path boundary matched by path segments, and the resolved destination addresses
  before a run. Loopback and private addresses MUST be supported when intentionally approved.
  Connections MUST use only the approved addresses while preserving hostname and HTTPS certificate
  checks; DNS changes MUST NOT redirect an active run. A changed destination requires new approval
  and a new run. All URLs MUST pass origin/path validation after canonicalization, including URLs
  extracted from responses. Redirect following MUST be disabled, even for in-scope destinations.
  Extracted URLs and specification server entries MUST NOT authorize scope changes.
- **FR-005**: Project authentication MUST support no authentication or static developer-supplied
  headers, including bearer tokens and header API keys. Eligible journey operations may register,
  log in, or reset credentials and explicitly bind extracted tokens to later headers. A journey
  binding MUST explicitly override a static header of the same name for that step only. Journey
  credentials MUST remain scoped to that journey and MUST be redacted alongside project secrets.
  Automatic token renewal, OAuth negotiation, cookie jars, browser login, and dedicated query-key
  authentication configuration are outside the MVP.
- **FR-006**: Run setup MUST expose finite request, elapsed-time, journey-count, step-count,
  and request timeout limits. Defaults are 200 requests, 10 minutes, 20 exploration journeys,
  10 steps per trial journey, and 10 seconds per request. The run clock starts at acceptance,
  including model/planning time and all phases. Reset, baseline HTTP checks, exploration, replay,
  minimization, and artifact verification share one request/time budget. Consume one request
  unit immediately before dispatch, including requests that fail or time out; local assertions
  and rejected plans consume no request units. Only one target request may be in flight per run.
  Before each trial's reset, require remaining units for every reset, baseline-check, and journey
  request in the validated finite sequence. Insufficient units stop work with BUDGET EXHAUSTED
  before reset; pending verification is INCONCLUSIVE. Time cannot be reserved by assumed latency.
  Request timeout is the lesser of its configured timeout and remaining run time; model calls
  have a 30-second deadline capped by remaining run time. Deadline expiry/cancellation MUST
  prevent new dispatches and interrupt in-flight work where possible, retaining its outcome.
  No automatic retries are allowed. Journey count limits exploration only; reaching it ends
  exploration but permits follow-up verification within remaining budgets. Proposed journeys
  exceeding the step limit are invalid plans. Reset and baseline sequences each have at most
  10 requests; local assertions do not count as journey steps. All finite sequences are known
  before admission; conditional request loops are unsupported.
- **FR-007**: Predicates MUST be immutable ID/version records containing source, approval
  status, applicability conditions, and expected assertions. Operands MUST reference named-step
  status codes, JSON fields, response headers, bound values, or typed literals. Comparisons MUST
  be limited to equals, not-equals, membership in a literal set, exists, and absent; conditions
  and assertions use conjunction only. Equality is typed, without implicit coercion; header
  names are case-insensitive. Unsupported operators MUST be rejected before execution.
  Outcomes MUST be SATISFIED (applicable and all assertions true), VIOLATED (applicable and at
  least one assertion false with every required operand evaluable), NOT APPLICABLE (a fully evaluable applicability condition false),
  or UNEVALUABLE (required evidence unavailable or invalid). Missing required steps, type errors,
  truncated required evidence, and failed execution MUST produce UNEVALUABLE. Explicit exists
  and absent checks may evaluate missing fields; a missing field used by other comparisons is
  UNEVALUABLE. Applicability MUST be evaluated before expected assertions.
  All stages MUST preserve predicate identity and semantics. Edits create a new version and
  require new confirmation. Eligible sources are developer-provided/approved assertions or
  explicit machine-readable specification assertions, limited to declared status/schema
  constraints representable by this profile. Descriptive business rules and agent hypotheses
  require developer approval. Unsupported schema constraints cannot silently become predicates.
  Baseline assertions MUST use this same format and every required check MUST be SATISFIED.
  If any required applicability operand is unevaluable, the result is UNEVALUABLE; otherwise
  any false applicability condition produces NOT APPLICABLE. With true applicability, any
  unevaluable assertion operand takes precedence over false assertions. Secret comparisons are
  evaluated deterministically using trial-memory values; saved evidence records only symbolic
  operands and the result. No user/model assertion is executable code.
- **FR-008**: Autonomous planning MUST generate unusual ordered multi-step journeys with input
  dependencies, prerequisites, and an explicit invariant or behavior under investigation.
- **FR-009**: Execution MUST accept only validated structured journeys, resolve dependencies
  from recorded values, and follow explicit timeout and retry rules. Mutating requests MUST
  not be automatically retried after ambiguous outcomes.
- **FR-010**: Each step MUST record operation, resolved inputs, relevant response evidence,
  timing, outcome, and observed state transitions with redaction and visible truncation.
- **FR-011**: Adaptive planning MUST use recorded observations to revise later journeys and
  retain the rationale, without expanding scope or budgets.
- **FR-012**: Finding classification MUST be determined by recorded predicate evaluations,
  approval eligibility, verified baseline evidence, and execution outcomes, never model verdicts.
  A VIOLATED initial trial creates OBSERVED VIOLATION. Missing approval, UNEVALUABLE/NOT APPLICABLE
  verification, failed baseline, execution failure, or insufficient budget makes pending
  verification INCONCLUSIVE. CONFIRMED requires initial VIOLATED evidence and one independent
  verified-fresh-state replay evaluating the same eligible predicate ID/version as VIOLATED.
  A valid applicable replay evaluating SATISFIED produces NON-REPRODUCED; NOT APPLICABLE is not
  proof of non-reproduction. Additional evaluations are append-only; later contrary results
  mark evidence inconsistent and require a new confirmation attempt from a new initial trial.
  Historical confirmation evidence remains recorded, but conflicting evidence cannot be
  presented as a currently consistent confirmed result. Approval after INCONCLUSIVE allows a
  new bounded verification run referencing the immutable original candidate; it never resumes
  the stopped run. Predicate edits create a new candidate/version and require a new initial
  trial and replay. EXECUTION ERROR is a step/run outcome, not a fifth finding classification;
  it records binding, transport, timeout, policy, authentication, or rate-limit failure reasons.
  A run can have EXECUTION ERROR with no finding; existing evidenced confirmation survives
  unrelated post-confirmation errors and retains its artifact verification status separately.
- **FR-013**: Minimization MUST minimize journey action count through greedy single-step
  deletion, rejecting candidates with broken dependencies and replaying valid candidates against
  the same predicate from verified fresh state. After accepting a reduction, repeat deletion
  attempts until no valid single-step deletion reproduces or budget exhaustion, cancellation,
  reset failure, or execution failure stops work. Preserve the best verified sequence, attempted
  reductions, and stopping reason. Report whether the single-step local stopping criterion was
  reached; MUST NOT claim a globally shortest sequence. Reset/baseline actions are prerequisites,
  not removable journey actions, and remain in reproduction/export instructions.
- **FR-014**: Every confirmed finding MUST include a report and standalone runnable regression
  artifact, with setup instructions, credential placeholders, expected invariant, observed
  violation, reproduction sequence, and evidence references. Unverified artifacts MUST not be
  presented as runnable verified tests.
- **FR-015**: Report exports MUST include human-readable Markdown and structured JSON. Regression
  exports MUST include an executable HTTP-request sequence with explicit invariant assertions
  and documented invocation; language and packaging are selected during planning.
- **FR-016**: Runs MUST display status, budget usage, journey/step progress, stop reason, and
  findings, and support cancellation and retention of completed evidence.
- **FR-017**: Project records, run snapshots, traces, findings, and export metadata MUST survive
  restart. Interrupted runs MUST be marked rather than automatically resumed.
- **FR-018**: Secrets MUST include project credentials, passwords, bearer/API/reset tokens,
  journey-issued credentials, developer-marked fields, and values extracted from designated
  sensitive fields. Persisted project credentials MUST be encrypted with the encryption key
  stored separately from project records; unavailable encryption MUST prevent credential
  persistence. Journey-issued secrets MUST remain only in trial memory and be discarded at trial
  termination; saved records MUST retain symbolic references and extraction instructions so
  replay obtains fresh values. Project deletion MUST remove stored credentials and evidence.
  Saved trace bodies and specification examples MUST be sanitized before persistence, not merely
  when displayed. Sensitive request/response fields MUST be designated by explicit developer
  selectors and default case-insensitive names: password, passwd, secret, token, access_token,
  refresh_token, reset_token, api_key, authorization, cookie, and set-cookie. Designated header,
  query, and JSON-field bindings propagate secret status to their destinations and derived
  values. Known secret exact values and their URL-percent/JSON-escaped forms MUST be replaced
  wherever encountered, including non-sensitive fields. Secret examples in imported content
  are sanitized too; credentials belong in protected configuration, not specification literals.
  Diagnostic logs MUST NOT contain unsanitized input/output or provider payloads. Persisted
  records are retained until project deletion; deletion includes credential versions and
  project-owned records, not externally downloaded files. If a stored encryption key is missing
  or decryption fails, refuse use, preserve records, and request credential replacement.
  Raw secrets MUST NEVER enter reasoning-model inputs. Stable symbolic replacements MUST be
  applied before model calls and before saving traces, diagnostic logs, findings, or exports,
  covering URLs, headers, request/response bodies, and recognized URL/JSON encodings. Symbols
  MUST preserve equality relationships within a trial without exposing secret values.
  Unexpected values in sensitive response fields MUST be classified before disclosure. Content
  that cannot be safely sanitized MUST be withheld from model inputs and saved evidence, with
  the reason recorded; dependent evaluation MUST be INCONCLUSIVE. Developers MUST be able to
  designate additional sensitive fields. Detection of arbitrary secrets in unmarked fields is
  not guaranteed. Exports MUST contain credential placeholders, never stored credential values.
- **FR-019**: Imported specifications, descriptions, target responses, and model outputs MUST be
  untrusted content. The model MUST NEVER directly authorize or issue target requests, approve
  destinations, or invoke the executor; deterministic policy alone admits validated work.
  The model may propose approved operations, declarative bindings, hypotheses,
  and predicates; deterministic code MUST validate their structure, eligible operations, types,
  dependencies, predicate eligibility, and all execution policies before execution. Rejected plans
  MUST record validation reasons. Model output and source content MUST NOT execute host commands,
  arbitrary model-provided scripts or expressions, expand scope/budgets, or approve invariants
  or credentials. Regression artifacts MUST be generated from validated declarative journeys,
  not executed as model-authored code.
- **FR-020**: Critical setup, execution-control, and results flows MUST support keyboard use,
  visible focus, textual status distinctions, and readable desktop and mobile trace inspection.
- **FR-021**: Developers MUST configure an in-scope HTTP reset sequence and explicit baseline
  assertions for the state relevant to their journeys. GhostQA MUST execute reset and verify all
  baseline assertions before every exploration journey, confirmation replay, minimization trial,
  and regression verification. Reset success responses alone MUST NOT establish freshness. All
  reset and baseline-check requests consume the same run budgets and scope controls. Partial
  reset, failed or unevaluable assertions, timeout, or insufficient remaining budget MUST stop
  the run before the trial; affected verification MUST be INCONCLUSIVE with the failed checks
  recorded. Manual acknowledgment and host shell reset commands are not supported.
  Reset is a developer-approved finite ordered HTTP sequence, with explicit expected response
  statuses and any declared reset assertions. Execute it once, then execute the declared finite
  baseline-check sequence and evaluate every required assertion. Every reset step must complete
  with its declared expected status and assertions, and every baseline assertion must be
  SATISFIED; empty baseline assertion sets are invalid. Failure stops immediately as BASELINE
  ERROR with completed evidence, no automatic retry or compensating cleanup. A baseline record
  belongs to exactly one immediately following trial and cannot be reused. Verification applies
  only to declared relevant state, not all hidden application state. Developers must prevent
  concurrent external mutations; known external interference invalidates the trial and makes
  pending verification INCONCLUSIVE. Reset/baseline requests use the same binding and secret
  rules; their transient values are confined to their associated trial.
- **FR-022**: Developers MUST be able to inspect completed journeys and findings for a selected
  run, including successful steps preceding a failure and inferred versus observed state.
- **FR-023**: Before starting, developers MUST review and approve the eligible operation set,
  be able to exclude operations, and explicitly acknowledge that mutating operations can alter or
  delete target data. Reset operations require the same approval. The model MUST NOT expand this
  set. Scope controls and request budgets apply to reset, baseline checks, exploration, replay,
  minimization, and artifact verification. Cancellation MUST stop scheduling all further requests,
  including cleanup; completed target-side effects MUST NOT be described as undone.
- **FR-024**: Cross-step values MUST use named declarative bindings extracted from prior JSON
  response fields by JSON Pointer or explicitly named response headers. Bindings may populate
  path, query, header, or JSON-body fields with deterministic encoding and type validation.
  Typed literals and named recorded per-trial generated values (including unique emails) MUST
  be supported. Generated values MUST be fresh for each clean-state trial while retaining their
  named relationships within that trial. Missing values or incompatible types MUST stop the
  affected journey without guessed substitutions. Extraction scripts, arbitrary expressions,
  regex extraction, and implicit URL following are unsupported. Replay and minimization MUST
  re-extract fresh response values rather than reuse stale IDs or tokens from discovery.
- **FR-025**: GENERATED denotes production of an artifact from a validated journey/predicate;
  verification status starts UNVERIFIED and remains so when pending, interrupted, or unsuccessful.
  VERIFIED requires that exact exported artifact to execute from verified baseline state and
  fail its intended assertion with the confirmed violation. Parsing, executor replay, and
  unrelated crashes are insufficient. Record immutable artifact identity, predicate ID/version,
  target/configuration, baseline evidence, assertion outcome, and verification time. Artifact
  edits invalidate verification. Repaired-target validation is separate and is unavailable on
  developer targets unless performed. Fixture acceptance requires repaired-variant passes.
  An artifact carries no active authority: every independent invocation MUST require explicit
  target/address/operation approval, mutation acknowledgment, supplied credential placeholders,
  and finite limits. It MUST enforce the same scope, pinned addresses, redirects, reset,
  cancellation, secret handling, and dispatch accounting as a run, without silent defaults
  broadening authority. Different targets require fresh approval; historical VERIFIED metadata
  does not verify the new execution. Independently invoked artifacts need no reasoning model.
  Language/packaging is a planning choice; safety obligations apply regardless of that choice.
  Verification failure or budget exhaustion leaves the artifact UNVERIFIED without erasing
  already evidenced finding confirmation. Every confirmed finding receives a report and
  runnable artifact with explicit verification status. Three faulty/fixed artifact executions
  per fixture are separate bounded acceptance runs, not retroactive discovery-run consumption.
- **FR-026**: Stop proposing exploration journeys after the first CONFIRMED finding, attempt
  minimization and artifact verification within remaining budgets, then finish. Otherwise
  exploration stops on request/time/journey budget exhaustion, cancellation, model failure,
  target failure, inability to verify baseline, or three consecutive valid but duplicate or
  non-useful planning rounds. Novelty compares normalized operation order, binding structure,
  and predicate ID/version; cosmetic changes and literal fresh-value changes are not novelty.
  Valid proposals without a new executable hypothesis increment stagnation; malformed output,
  hallucinated/excluded operations, invalid bindings/predicates, or any policy-invalid plan
  instead stop immediately as MODEL PLAN ERROR, before requests. Provider unavailability,
  provider rate limits, or model-call deadline expiry stop as MODEL ERROR without retries.
  Connection failure, request timeout, target rate limit, or unexpected execution-blocking
  authentication rejection stops as EXECUTION ERROR; findings awaiting verdict are INCONCLUSIVE.
  Expected response status sets, including 401/403 under investigation, MUST be declared in the
  validated journey before execution. Such complete responses remain application evidence;
  the model cannot reclassify failures after observing them to bypass execution policy.
  Missing/runtime-type-invalid bindings and policy violations discovered before a later
  request are EXECUTION ERROR, with no dispatch of that request. Complete non-authentication
  application error responses remain predicate evidence unless required setup cannot complete;
  429 always stops as target rate limit. Responses 401/403 not declared as possible outcomes
  under investigation stop as authentication EXECUTION ERROR. An expected 401/403 that does
  not occur is evaluated by the predicate (potential VIOLATED), not preemptively suppressed.
  Run stop reason, step execution outcome, and finding classification MUST remain separate.
  Existing CONFIRMED evidence survives later failures. A stopped run never silently resumes.

- **FR-027**: URL validation MUST reject userinfo, fragments, invalid escapes, backslashes,
  dot segments (including percent-encoded forms), encoded path separators, and ambiguous/double-
  encoded path escapes. Compare lowercase normalized hostname and effective port for the approved
  scheme; percent-encode bound path segments as data and enforce the decoded path-segment boundary
  after construction. Query data cannot alter the path/origin. Explicit Host, proxy-routing,
  Content-Length, Transfer-Encoding, Connection, and other hop-by-hop/transport-control headers
  MUST NOT be supplied by developer/model bindings; deterministic transport owns them. Scope
  checks cannot be bypassed by proxies, redirects, response URLs, or request-header overrides.
- **FR-028**: Non-request processing MUST be bounded: imported documents at most 2 MiB, expanded
  node traversal at most 100,000 nodes, schema depth at most 10, generated arrays at most 20 items,
  and generated strings at most 256 characters. Supported formats are email and uuid; arbitrary
  string patterns and formats other than email/uuid MUST block affected generation; there is
  no unspecified pattern-support subset. Numeric generation uses finite values in the range
  -1,000,000 through 1,000,000 intersected with declared constraints; integer values remain
  integers. Object generation includes only declared properties, respecting required fields;
  additional free-form values are not generated. Inconsistent constraints block the operation.
  Constraints requiring values beyond these bounds block generation and are reported. YAML
  executable tags and duplicate mapping keys MUST be rejected; alias expansion counts toward
  node limits. Import has a 10-second processing deadline outside runs. Response bodies are
  capped at 1 MiB; larger bodies are marked truncated, and predicates needing omitted content
  are UNEVALUABLE. Model input is capped at 128 KiB of sanitized context, with 64 KiB maximum
  structured output; oversized/invalid output stops as MODEL PLAN ERROR. Every run processing
  operation is capped by the remaining run deadline; no phase can reset the clock. Each model
  round contains one bounded proposal call; no hidden autonomous subloops are allowed.
- **FR-029**: Benchmark records MUST contain run/trial identity, faulty/fixed identity hidden
  from the planner, baseline verdict, discovery and confirmation outcomes, stop reason, request
  count by phase, exploration journey count, model-call count (including failed calls), approximate
  input/output token usage, and original/minimized journey lengths excluding reset/check steps.
  Provider token usage is preferred; otherwise use ceiling(sanitized UTF-8 byte count / 4) for
  input/output separately and label it estimated. Unavailable failed-call output usage is
  explicitly unknown, never zero. Discovery and confirmation are separate rates out of all five
  assigned trials; errors remain in the denominator. False-positive rate is repaired-invariant
  confirmations divided by five repaired trials. All metrics are reported per fixture/variant.

### Key Entities *(include if feature involves data)*

- **Project**: Named testing workspace with target configuration, credentials, specification,
  expected invariants, and reset prerequisites.
- **Specification Snapshot**: Imported document, validation results, declared operations, and
  mapping used by a run; immutable for that run.
- **Run**: Bounded exploration session with immutable configuration/specification/predicate
  snapshots, status, budget usage, counters by phase, model usage, and terminal reason; owns
  journeys and findings. Predicate approval records are separate append-only owner decisions.
- **Journey**: Ordered dependent actions, named bindings and generated values, investigation
  predicate, rationale, setup context, and journey-scoped sensitive values.
- **Step Record**: Resolved action and redacted request/response evidence with outcome and timing.
- **State Mapping**: Declared facts, inferred dependencies, hypothesized state, and observed
  transitions, each with provenance and evidence references where applicable.
- **Finding**: Candidate violation tied to immutable predicate ID/version, initial/replay
  baseline evidence, classification history, consistency flag, and minimized journey.
- **Export Artifact**: Report or regression test tied to a finding, with verification status and setup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 4 of 5 representative developers create a project, import a valid document,
  configure a target, and start their first run within 5 minutes using only product instructions.
- **SC-002**: In controlled acceptance trials, each of three documented state-bug fixtures is
  discovered and independently reproduced in at least 4 of 5 runs under the default budgets.
  The benchmark MUST contain faulty/fixed pairs for: password-reset token use after email or password change;
  fulfillment after order cancellation; and earlier-issued access-token use after membership
  revocation. Each variant receives five independent fresh trials. Provide supported OpenAPI,
  reset/baseline operations, credentials, and eligible expected invariants, but do not provide
  triggering sequences, fixture bug labels, or faulty/fixed identities to the planner. Record
  model identity/configuration and budgets. Fixed variants MUST produce zero confirmations of
  their repaired invariant. Discovery means the planner generated the violating dependent journey;
  replaying a supplied reproduction sequence does not count.
- **SC-003**: Every finding labeled confirmed includes an explicit invariant, recorded violation,
  successful independent replay from verified fresh state, report, and regression artifact with
  explicit verification status; repaired variants produce zero confirmations of their repaired
  invariant. Artifact-verification failure MUST NOT retroactively erase valid finding evidence.
- **SC-004**: On all three fixtures, minimization removes deliberately redundant steps while
  preserving reproduction, using a separate minimization acceptance case with a known violating
  recorded journey plus an independent redundant action; that supplied case is never discovery
  evidence or planner input. Every exported verified test fails on the faulty fixture and passes
  on its repaired counterpart in three consecutive clean-state executions.
- **SC-005**: All boundary trials (origin/port changes, path escapes, redirect responses, DNS
  changes, and excluded operations) prevent unauthorized requests and stop scheduling at cancellation
  or budget exhaustion. Cancellation status becomes visible within 2 seconds of acceptance.
- **SC-006**: All export and trace-redaction trials expose zero configured secret values; all
  restart trials retain completed records and explicitly identify interrupted runs.
- **SC-007**: At least 4 of 5 representative developers can locate a confirmed finding's expected
  behavior, observed violation, and reproduction steps within 2 minutes without assistance.
- **SC-008**: All critical setup, cancellation, and result-inspection tasks can be completed using
  a keyboard at desktop width and without loss of content or controls at a 375-pixel viewport.
- **SC-009**: All reset-failure trials (partial reset, failed assertion, unavailable evidence,
  timeout, and exhausted budget) stop before the next journey or verification trial; no affected
  finding transitions to CONFIRMED. Successful trials record passing baseline checks.
- **SC-010**: All stopping-condition trials end with the specified reason, preserve completed
  evidence, and issue no new exploration requests after the first confirmation. Three consecutive
  valid duplicate/non-useful rounds trigger stagnation; invalid plans stop immediately. Expected rejection responses
  in authentication journeys remain evaluable; unexpected execution-blocking failures stop runs.
- **SC-011**: Import trials across both supported OpenAPI versions report every blocked operation,
  never fetch remote references or select specification servers, and prevent runs with zero
  eligible operations. All binding trials re-extract fresh values, reject missing/type-invalid
  values, and redact journey tokens. Provenance views distinguish all four evidence categories.
- **SC-012**: All secret-lifecycle cases produce zero secret disclosure in model payloads,
  saved trace/specification records, logs, findings, and exports for designated/known secrets and
  their recognized encodings; encrypted credential persistence, failed-key behavior, symbolic
  replay, and project deletion satisfy FR-018 without claiming arbitrary-secret detection.
- **SC-013**: Every predicate/finding transition case has the FR-007/012 outcome, with no
  confirmation from unapproved, unevaluable, non-applicable, stale-baseline, or edited-predicate
  evidence. Generated/verified artifact states and independent authority satisfy FR-025.

**Acceptance procedures and traceability** (all cases MUST pass unless a rate is specified):

| Procedure | Requirements / outcome | Observable acceptance procedure and pass condition |
| --- | --- | --- |
| AP-001 Setup | FR-001–006, FR-021/023; SC-001 | Give five first-time representative developers a supported fixture document, reachable target, credentials, reset/check definitions, and product instructions. Time from setup start to accepted run, including scope review; at least four finish within five minutes. Invalid document/target and missing approval cases dispatch zero requests and show reasons. |
| AP-002 Discovery | FR-003/007–012/019/024/026/029; SC-002/003 | Run each of three faulty/fixed pairs five times with defaults and fresh planner history, approved predicates, and verified reset. Hide variant identity and trigger sequences. Record generated journeys and all FR-029 metrics. Each faulty fixture has at least 4/5 discovered and confirmed trials; every fixed fixture has 0/5 repaired-invariant confirmations. Inspect initial and replay evidence for every confirmation. |
| AP-003 Minimization/artifacts | FR-013–015/025; SC-004/013 | Separately provide one confirmed recorded journey per fixture with an unrelated removable action. Require its removal and same-predicate fresh replay. Run the exact exported artifact three times on each faulty/fixed variant with fresh approval/reset and default independent budgets. All faulty executions fail the intended assertion and all repaired executions pass; crashes cannot satisfy either. Interrupt minimization/verification and require best evidence plus honest local/UNVERIFIED status. |
| AP-004 Network authority | FR-004/005/019/023/025/027; SC-005 | Exercise origin/port changes, path-boundary escapes, ambiguous encodings, redirect responses, DNS changes, excluded operations, reserved headers, and extracted cross-origin URLs. Capture target dispatches; zero forbidden requests, no redirect following, only approved pinned addresses. Repeat for independent artifacts and absent approvals. Intentionally approved loopback/private targets remain usable. |
| AP-005 Secrets/storage | FR-001/005/010/017/018/024; SC-006/012 | Plant known and designated secrets in headers/query/body/spec examples, unexpected response fields, and URL/JSON encodings. Inspect captured model payloads and persisted records/logs/exports for zero raw values. Require symbols and taint propagation; unsafe content is withheld and dependent verdict inconclusive. Inspect credential persistence for encryption and separate key; unavailable/wrong key prevents use. Restart, rebind fresh trial tokens, replace credentials, and delete a project; unrelated project records remain and deleted project records/credentials are absent. |
| AP-006 Finding comprehension | FR-010/012/014/016/022; SC-007 | Give five representative developers a confirmed fixture report. Time finding expected behavior, observed violation, and reproduction; at least four identify all three within two minutes without assistance. |
| AP-007 Accessibility | FR-020; SC-008 | Complete setup, cancellation, and trace inspection by keyboard at 1280-pixel desktop width and inspect at 375-pixel width; every control is reachable, focus visible, statuses textual, and details available without clipped/lost controls. Horizontal trace scrolling is permitted. |
| AP-008 Baseline | FR-006/007/021; SC-009 | For all four trial types supply passing, partial-reset, wrong-status, failed/absent/unevaluable assertion, timeout, external-interference, and insufficient-budget setups. Passing records are unique per immediately following trial. Failure dispatches no trial requests, stops with the specified reason, and cannot confirm pending findings. |
| AP-009 Stops/errors | FR-006/009/012/017/019/023/026/028; SC-005/010 | Inject budget edges, exact-full-trial versus short-by-one admission, failed dispatched requests, in-flight/model deadlines, cancellation, malformed/oversized model output, hallucinated operations, invalid plans, provider outage/rate limits (including Gemini if configured), three valid duplicate/non-useful rounds, runtime binding failure, expected/unexpected 401/403, target 429/outage, and restart. Require exact counter/stop/outcome rules, zero invalid dispatches, retained evidence, no new scheduling after stop, and visible cancellation within two seconds. |
| AP-010 Compatibility/flow | FR-002/003/024/028; SC-011 | Use each JSON/YAML × 3.0/3.1 combination with every supported method, nullable form, primitive/array parameter style, bounded type/constraint, and internal reference. Add unsupported/unresolved/remote/recursive/ambiguous/oversized variants and multiple servers. Require supported operations eligible, affected unsupported operations reasoned exclusions, zero remote fetches, and no run for zero eligible operations. Missing/type-invalid bindings never dispatch guessed values; replays extract new IDs/tokens; provenance distinguishes four categories. |
| AP-011 Predicate lifecycle | FR-007/012/019/021/025; SC-013 | Supply fixtures for all comparison and predicate outcomes, missing/truncated operands, unapproved hypotheses, approved and specification-derived assertions, independent violating/satisfying/non-applicable replays, later approval, predicate edits, and conflicting later evidence. Require exact state transitions with append-only history, new evidence on edits, no false CONFIRMED/VERIFIED, and separated EXECUTION ERROR outcomes. |

All success criteria SC-001–013 map to the procedures above. AP-001/005 additionally cover project
creation, persistence, credential replacement, and deletion. Independent acceptance runs each
receive their own finite default budgets; they never enlarge an active discovery run's budget.
Benchmark failures are results, not grounds to silently remove a trial from denominators.

## Assumptions

- The first release is a single-developer, locally operated web workspace. Team accounts, shared
  permissions, public hosted multi-tenancy, billing, and enterprise administration are out of scope.
- Local targets must be reachable from the execution environment; a browser-local address alone
  does not establish reachability. Developers provide disposable local/staging environments,
  appropriate credentials, and in-scope HTTP reset operations plus machine-checkable baseline
  assertions for repeatable exploration and verification.
- Target scope is one explicitly configured origin and base-path boundary per project. GraphQL,
  streaming protocols, cross-origin workflows, and remote specification-reference fetching are
  outside the MVP. Unsupported REST operations are identified rather than silently omitted.
- Authentication is limited to static project headers and explicit journey header bindings.
  Supported authentication actions must be declared eligible operations and use FR-024 bindings.
- A planning/reasoning service is available when runs start; outage is a visible failed or
  inconclusive run, never a simulated successful exploration.
- The default budgets are initial product limits, not throughput promises. User overrides must
  remain finite and all phases consume the same configured limits.
- State invariants may require developer input because OpenAPI alone does not encode every
  business rule. GhostQA offers autonomous hypotheses without equating them with verified facts.
- Fixture token acquisition MUST use JSON fields/headers from in-scope HTTP operations, never
  email delivery, browser actions, cookie management, or external services. Reset checks ensure
  empty fixture users/orders/memberships as appropriate. Faulty/fixed variants expose identical
  operation contracts and neutral names; the only intentional difference is the seeded violation.
  The password-reset fixture asserts that all previously issued account reset tokens are rejected after either an email change or a successful password change; newly issued tokens and other accounts remain unaffected; order fixture
  asserts fulfillment is rejected after cancellation; membership fixture asserts old-token access
  is rejected after revocation. Their final-step allowed status sets are explicitly provided as
  approved predicates, without the triggering sequence. All fixtures and their constraints fit
  FR-002/028. Developers supply representative valid setup data where needed.
- The illustrative password-reset journey is a seeded fixture, not a verified real-world bug.
- Developers exclude concurrent external mutation of baseline-relevant state during trials.
  Baseline checks establish declared observable state only, not universal target cleanliness.
- Target latency and environment readiness constrain exploration; no universal discovery or
  coverage guarantee is made. Acceptance measurements use documented controlled targets.
- The recommended stack is evaluated in planning. No implementation technology is mandated here.
- Browser testing, UI automation as a product capability, CI/CD, GitHub integration, load
  testing, and penetration-testing capabilities are explicitly outside this MVP.
- The benchmark is controlled acceptance evidence, not a real-world discovery-rate guarantee.
  Artifact packaging remains a planning choice; schema/predicate profiles and bounds are now
  defined requirements and cannot be relaxed silently.


Accepted requirement amendment (2026-10-01, project owner): rename the initial eligible invariant-violation state from SUSPICIOUS to OBSERVED VIOLATION. This label means a recorded violation, not a confirmed bug; independent fresh-state replay remains required for CONFIRMED. The account fixture must cover invalidation of previously issued reset tokens after both email changes and password changes. Password changes use the existing successful password-reset operation; no additional endpoint or backend service is required. Historical evidence and immutable transitions retain their original vocabulary. New predicates receive new identities/hashes; existing predicate evidence is not rewritten.
