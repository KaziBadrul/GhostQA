# Quickstart validation guide (planned commands)

No application is implemented yet. The commands below are the script contract implementation must
provide; they cannot run in the current documentation-only repository. No benchmark results are claimed.

## Prerequisites and configuration

Node 24 LTS, npm, PostgreSQL 17+, Gemini account with eligible configured model/quota. Defaults:
local app 127.0.0.1:3000, fixture 127.0.0.1:4010 under /api. Database reachable from Node; no automatic
Docker/Supabase provisioning required. Configure DATABASE_URL, GEMINI_API_KEY,
GEMINI_MODEL=gemini-3.5-flash-lite, and GHOSTQA_CREDENTIAL_KEY through protected environment/local
untracked configuration. Key is a separately stored 32-byte encryption key, never database content.
Do not pass target credentials in command-line args. A fixture reset/token API is test infrastructure,
not a recommended production reset endpoint.

```sh
npm ci
npm run db:migrate
npm run test:unit
npm run test:contract
npm run fixture -- --scenario account --variant faulty
npm run dev
```

These start a single persistent app supervisor and separate local fixture. Development and production
must use the owned server lifecycle; not `next dev` alone. Production script contract:
`npm run build` then `npm start`. Build creates fixed engine worker and offline runner bundles.

## First vertical slice

Create project; import fixture /openapi document; inspect approved operations/exclusions; configure
reset POST /api/control/reset and baseline GET /api/control/baseline with all counts zero assertions.
Approve explicit origin/base path and displayed addresses; exclude control operations from model
exploration while approving their reset/check use. Load approved account invariant and fixture
inputs without a trigger sequence. Start with default budgets and configured live Gemini.

Expected: real model proposes a dependent journey; deterministic validator rejects unsafe proposals;
passing plans reset/check fresh state, execute and save symbolic observations; initial violated
predicate yields OBSERVED VIOLATION, eligible fresh replay yields CONFIRMED; minimizer records best verified
sequence; report and bundle are generated; the exact manifest is verified through the existing supervised
engine within the same remaining budget. A failure
is shown honestly with stop reason/inconclusive status, not replaced by a canned discovery.
Inspect ordered request phase counts, both baseline IDs, exact predicate version/hash, redacted
token symbols and artifact hash. No raw reset/bearer token in model requests or persisted traces.

## Automated acceptance and benchmark

```sh
npm run test:integration
npm run benchmark -- --suite required --trials 5
npm run benchmark -- --suite supplemental --trials 5
npm run test:artifacts
```

Required suite runs account, order, membership faulty/fixed variants individually with empty model
history, fixed code/prompt/model/settings and defaults. Supplemental invitation/stale-resource
suite reports separately, never substitutes for required fixtures. No tuning during trials.
Metrics: discovery/confirmation counts out of five, repaired false positives, failures/stop reasons,
journeys, phase request counts, model calls, token usage/estimate labels, original/best action length.
Pass SC-002 only when each required faulty pair has >=4/5 discoveries and confirmations and fixed
counterparts have zero repaired-invariant confirmations. Reports record failures in denominator.
Artifact tests use separate known redundant journeys for minimizer acceptance and three fresh faulty/
fixed bundle executions per pair. Assert intended invariant failure on faulty, pass on repaired;
syntax/crash failure does not count. See spec AP-001–011 for complete outcome/acceptance matrix.

## Independent artifact validation

```sh
node exported/regression.mjs --manifest exported/manifest.json
```

Runner asks explicit target, resolved-address/operation approval, mutation acknowledgment, limits,
and secret placeholders every invocation. No inherited permission from historical artifact metadata;
reject absent approval or unavailable secrets without requests. SIGINT cancels further dispatch.
Same fresh-state/scope rules apply with a new independent budget; no Gemini/PostgreSQL needed.
This result does not update original run evidence or grant VERIFIED status. Verify faulty assertion
failure is distinguished from EXECUTION ERROR and repaired passes.

## Manual functional UI acceptance

Follow AP-001/006/007 with five representative developers where specified, 1280px desktop and
375px narrow viewport, keyboard-only critical workflows. Session phase/budget/cancel/trace/findings
must be comprehensible without chat or color-only indicators. Run AP-004/005/008–011 adversarial
contract cases before connecting staging. No visual-test framework or UI automation is required.

## Completion evidence

Keep sanitized acceptance results with code/dependency/prompt/model hashes, fixture versions,
30 required discovery run records, separate paired artifact results, and requirements mapping.
Quota failure does not excuse missing rates. Never state MVP acceptance passed before these
measurements exist. Restart must show previous active runs INTERRUPTED without repeating mutations.

## Dispatch ownership acceptance gate

Exercise reset, baseline, exploration, replay, minimization and exact-manifest verification in one
run. Assert all intents cross one supervisor-owned dispatcher and one BudgetManager. Cancel during
artifact verification and while persistence is awaiting completion; after acceptance observe zero
new socket dispatches. Repeat with advisory-lock connection loss and supervisor shutdown. In-flight
requests may be interrupted, never reported rolled back. Independent runner output must leave the
original run counters, credentials, evidence and VERIFIED metadata unchanged. These are planned
acceptance checks, not claims that implementation tests have already passed.
