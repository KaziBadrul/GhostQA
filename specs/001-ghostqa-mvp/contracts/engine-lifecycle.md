# Engine lifecycle, authority and safety contracts

## Agent loop

Inputs: immutable API model, provenance mappings, symbolic configured values, eligible predicates,
remaining limits and bounded sanitized observations. One Gemini proposal call per round proposes
mapping/hypotheses/next journey with rationale in a single structured response. No tool execution,
provider callbacks, model-owned loop, or raw secret input. Strict Zod followed by journey/input/
predicate/scope validation. Unknown operation/parameter/property, overlong journey, missing dependency,
invalid output or policy escape stops immediately before requests (MODEL PLAN ERROR).
Valid but duplicate/non-useful proposals increment stagnation; three consecutive such rounds stop.
A new executable hypothesis clears stagnation. No unlimited mapping warmup or analysis loop.

Before each trial: check cancellation/time, validate full request count, check journey limit for
exploration, create fresh variable store, execute reset/checks, record verified baseline, execute
sequential journey, evaluate predicate, persist sanitized evidence. Summarize observations back to
next round only when no first-confirmed stop or terminal error. Discovery candidates lacking eligible
approval become INCONCLUSIVE, not auto-approved. Approval later starts a new bounded verification run.
No implicit human-wait loop that pauses and resets the deadline. Expected status sets are admitted
before execution; candidate final statuses may include both correct rejection and unexpected success.

## Trial/fresh-state lifecycle

1. Resolve immutable operation/predicate/reset refs; validate backward dependency graph and count
   reset + baseline-check + journey requests. Reserve admission capacity without consuming it.
2. BudgetManager permits trial only when all request units fit. Time is a hard deadline, not a
   maximum-time reservation. Generate new declared literals/emails/UUIDs satisfying schema.
3. Reset ordered in-scope approved HTTP actions. Validate each declared status and reset assertion.
4. Execute baseline inspection HTTP steps; all required conjunction assertions must be SATISFIED.
   Record a BaselineResult tied to this trial; no trial can reuse it. Partial success, timeout,
   false/unevaluable baseline, or known external interference stops BASELINE ERROR. No retries or
   cleanup after stop/cancellation. Insufficient admission stops BUDGET EXHAUSTED before reset.
5. Carry only the permitted trial-local variables into the journey. Re-extract IDs/tokens anew;
   never substitute discovery values. Every request requires operation/schema/policy validation
   again after substitution, then sole BudgetManager dispatch authorization.
6. Record predicate verdict with exact ID/version/hash, baseline ID and step evidence. Discard raw
   issued secrets on completion, including failed trials. Only symbols/extraction instructions persist.

## Predicate/finding lifecycle

Evaluate condition/operands deterministically with typed equality, literal-set membership,
exists/absent and conjunction only. JSON Pointer selection returns distinct ABSENT versus invalid
missing-step/type/truncation states; secret operands are evaluated in transient memory, recorded
symbolically. Applicable assertion evaluation needs every operand; unevaluable outranks false.
SPEC_ASSERTION derives only declared statuses/required fields/enums representable in this profile;
no natural-language business-rule inference can gain that provenance. Developer-approved hypotheses
retain original AGENT source plus append-only approval. Pure finding reducer consumes evidence,
not explanations. First VIOLATED + independent verified-baseline eligible VIOLATED replay => CONFIRMED.
Replay applicable SATISFIED => NON-REPRODUCED; no verdict => INCONCLUSIVE. Record inconsistent later
replays separately. EXECUTION ERROR belongs to step/run, not the finding enum.

## Verification and minimization

Replays use new trial ID, fresh reset/baseline, same predicate and immutable journey definitions,
fresh generated values and extractions. At least one replay is required; one sufficient independent
replay is the MVP contract. Do not claim probabilistic reliability from it.

Greedy deletion for n <= 10: iterate candidate removal indexes in original order; reject deletion
when it removes a predicate-referenced step, required producer or prerequisite. Every valid candidate
gets a fresh admitted trial. VIOLATED accepts reduction and restarts scan; SATISFIED/NOT APPLICABLE
cannot accept a reduction; UNEVALUABLE means no reduction evidence. Execution/reset/deadline failure
stops and retains last verified best. Local stop after a full scan accepts no single-step deletion.
At most n reductions and a bounded finite scan per reduction; a visited candidate hash set prevents
repeating equivalent attempts. Budget/time/cancel always dominate. Preserve predicate step IDs,
never rewrite logical assertions just to enable deletion. Report original/best count and attempted
candidates; local criterion only, not global minimum.

## Single budget authority

The supervisor-owned dispatcher contains the single BudgetManager, which owns monotonic deadline, immutable limits, phase counts, exploration count and cancel
state. Trial admission is distinct from dispatch consumption. Immediately before each target socket
request, apply the authoritative chain: RunSupervisor → BudgetManager → frozen ScopePolicy /
operation policy → final cancellation check → deterministic HTTP Executor. Persist the consumed
intent/counters, then recheck deadline, supervisor gate and policy validity before socket creation.
A cancellation/lock-loss/shutdown arriving during persistence prevents dispatch; conservatively
charged intent is not refunded. Engine/phase modules submit structured intents and have no target
transport capability or shadow request counters. The final gate check and socket creation have no
intervening await. The worker never receives a copy of BudgetManager state as authorization.
A conservatively consumed intent is not refunded after failure/crash. Local assertions have no
request cost; baseline inspection HTTP does. Provider calls have separate count/token telemetry
and consume elapsed time, not target request units. Provider call deadline <=30s and remaining run;
request deadline <=configured 10s default and remaining run. Worker parent watchdog enforces wall
limits on blocked parsing/provider output processing. Deadlines never restart between phases.
Journey count stops exploration, leaving budget for pending follow-up. Request/time exhaustion,
cancellation and baseline failure stop all target work, including artifact verification/cleanup.
Cancellation accepted by RunSupervisor, advisory-lock connection loss, or supervisor shutdown
closes the same authoritative gate permanently for that run before acknowledging cancellation.
Abort outstanding target requests where possible. Lock reacquisition cannot resume a stopped run.
No target-side effects are claimed undone. Worker termination cannot create another dispatcher.

## Pinned network transport and threat model

At scope preview DNS resolve with a finite deadline, normalize IPs (including mapped IPv6), present
complete set and original scheme/host/effective port/base path and operation IDs to developer. Bind
approval to hash of these values and mutation acknowledgment. At run acceptance do not silently
re-resolve; expired/stale preview requires another explicit approval. Select deterministic first
approved address, no transparent fallback. Run-owned native HTTP lookup returns that address only.
Literal addresses use the same check. Keep URL hostname/Host and DNS-name SNI; normal CA/hostname
verification and certificate checking remain enabled. No rejectUnauthorized:false fallback for
local self-signed targets: operator can install a trusted CA outside the model/config contract.

Inspect original path text before URL parsing can normalize away dot segments. Reject userinfo,
fragments, backslashes, malformed escapes, encoded separators and double-encoded boundary escapes.
Encode bound segments as data; compare decoded normalized path segments, not string prefix.
Only method/path from approved ApiOperation constructs a request. Extracted absolute URLs are
values; if used as destinations they must match an approved operation path and frozen scope.
Reserved Host/proxy/TLS/socket/transport headers and options cannot be supplied by model or project.
Native transport ignores proxy environment routing; do not use HTTP_PROXY agents. No redirect
following; record Location only as sensitive-reviewed data. New DNS answers cannot redirect sockets.
Check socket remoteAddress against selected pinned IP before payload. TLS SNI/certificate identity
matches hostname, not substituted IP. No cookie jar, HTTP2 push, automatic retries or compression.

Limits: 1 MiB encoded request body; 16 KiB total request/response headers; 1 MiB response cap; stream
read/destroy on excess, marking truncation. Request Accept-Encoding:identity; reject compressed
response as unsupported execution. Mark incomplete evidence UNEVALUABLE, never parse a truncated
body as a complete JSON object. Abort destroys sockets and streams; do not rely on idle timeout.

This controls GhostQA egress, not the approved service's behavior. Explicitly approving private/
local addresses allows them intentionally; it is not a blanket SSRF block. Compromised approved
hosts, external target-side effects and mutations already delivered cannot be prevented/undone by
this policy. Public exposure of local control endpoints is unsupported.

## Secrets and model boundary

CredentialStore encrypts versioned project slots AES-256-GCM; nonce unique per record, AAD includes
project/slot/version, key outside DB/repository. Journey vault holds typed values and taint only in
trial memory. Defaults/developer selectors mark credential/password/token/header/query/body fields;
propagate taint across interpolation. Value-level matching plus URL/JSON encoded variants handles
unexpected echo into other fields. Sanitize before provider, DB, diagnostics/UI, findings/reports
or export. Stable symbols preserve equality relation; do not hash low-entropy secrets as symbols.
Never log provider raw payloads or exceptions that embed request bodies. No storage of raw imported
specification examples before sanitization. Unsafe response withheld; dependent verdict inconclusive.
Unknown secrets hidden in unmarked data remain an explicit limitation. JS memory cannot guarantee
secure erasure; use short-lived references, worker teardown and never serialize raw issued secrets.

## Regression/report lifecycle

Produce Markdown/JSON report and validated manifest with exact predicate/reset/dependency data,
credential slots and runner version; bundle fixed offline runner with esbuild. Bundle manifest and
runner hash jointly identify the exported package; manifest hash separately identifies exact
reset/journey/predicate data being verified. GENERATED is creation; UNVERIFIED remains until the
existing supervised engine interprets that exact manifest, establishes fresh baseline, and reaches
and fails its intended assertion with the confirmed violation. All its intents go through the
originating run's sole supervisor-owned dispatcher and BudgetManager. No second worker, exported
runner, or artifact module has independent target dispatch authority during this verification.
Store manifest/package identity, predicate, baseline, assertion and supervised-path provenance;
VERIFIED certifies this exact manifest's supervised evaluation, not independent runner execution.
Internal verification uses existing frozen authority and remaining budget; it cannot reset either.
Independent invocation happens later outside the originating run: the fixed runner requires fresh
explicit target/address/operation approval, mutation acknowledgment, finite independent limits and
injected credentials each time. Preserve artifact operation/path expectations and reject broader
scope silently inferred from manifest or responses. Credentials use protected environment/stdin,
not command-line arguments. No original credentials, counters, execution capability or database
write authority are exported. Independent results cannot retroactively alter original run evidence
or grant GhostQA VERIFIED status. Testing faulty/fixed runner behavior remains separate acceptance.
No DB or Gemini requirement in standalone runner. User invocation via node is not GhostQA shell
execution; GhostQA never executes arbitrary commands. Edits create new artifact identity; old
VERIFIED does not apply to a new target or edited content. Repaired-fixture trials are separately
approved/bounded acceptance executions, three per variant, with no retroactive budget accounting.
