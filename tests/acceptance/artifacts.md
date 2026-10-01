# T047 — Required paired artifact acceptance

**PASS — Codex-executed automated acceptance on repository-owned local fixtures.**
This is supplied-reproducer artifact acceptance, not autonomous discovery or Gate 5.
T046 was verified, checkpointed and checked before T047 implementation began.

| Required fixture | Independent faulty  | Independent repaired | Supervised faulty       | Supervised repaired        |
| ---------------- | ------------------- | -------------------- | ----------------------- | -------------------------- |
| order-lifecycle  | 3/3 FAIL / VIOLATED | 3/3 PASS / SATISFIED | 3/3 VIOLATED / VERIFIED | 3/3 SATISFIED / UNVERIFIED |
| inventory        | 3/3 FAIL / VIOLATED | 3/3 PASS / SATISFIED | 3/3 VIOLATED / VERIFIED | 3/3 SATISFIED / UNVERIFIED |
| workflow         | 3/3 FAIL / VIOLATED | 3/3 PASS / SATISFIED | 3/3 VIOLATED / VERIFIED | 3/3 SATISFIED / UNVERIFIED |

The intended exact assertion, predicate ID/version/hash and manifest hash were
checked for every execution. No crash/error/interruption counted as a successful
reproduction or pass. All 36 required execution records are retained in
[t047-observed.json](t047-observed.json), alongside three paired-package source
manifests and 18 supervised source/result chains. Each record includes run/trial,
baseline and evidence identity where applicable, finite budget and result.

## Same fixed package per pair

Each required fixture generated one fixed `.mjs` package through the existing
production esbuild bundler. The test imported that actual compiled package and
invoked its embedded-manifest `runStandalone` function six independent times:
three intentionally inconsistent executions, then three repaired executions.
Manifest/runner/package identity and unchanged compiled bytes were checked.
The corresponding manifest subsequently received supervised VERIFIED through its
own originating run; those additional three package-origin verifications are
recorded separately from the 18 supervised repetitions.

| Fixture         | Joint package hash                                                 |
| --------------- | ------------------------------------------------------------------ |
| order-lifecycle | `bbed0cd1771966f7b777d25f5a8bba123143276e9695efe91cb72ebd98ed667b` |
| inventory       | `21982a382ccf32b83e81727aff495037d7122b1b3c042ee82bea6e94dedcbee4` |
| workflow        | `f275873069f09e4b0a58f79244c875ec0f987a8f483d954137bf20ef6683cad2` |

Exact manifests, runner hashes, package hashes and supervised baseline/assertion
references are in `packageSources`/`packageOrigins` in retained observations.
Packages were temporary test exports, cleaned after execution; their full
manifests and joint identities are retained and static rebuilds verify identity.
The bundle excludes Gemini, database/originating repositories and the protected
GhostQA executor. Its neutral transport has no originating write/status authority.

## Clean state and independent authority

Each standalone invocation explicitly supplies target `/api`, pinned loopback
address, exact operation approval, mutation acknowledgment, empty credential/input
slots, and its own finite budget: five requests, 10000 ms, 1000 ms request timeout.
The exact exported reset/baseline contract executes before its three-action
journey. All six trial and baseline identities per package are distinct.
Insufficient four-request admission returns ERROR / BUDGET EXHAUSTED with zero
requests; cancellation returns ERROR / CANCELLED. These refusals do not count as
faulty failures or repaired passes.

Before and after each independent invocation, every originating project, approval,
run counter, predicate, journey, step, observation, evidence, finding/transition
and artifact row was compared. No originating state changed. Matching before/after
state hashes are retained. Generated source artifacts remained UNVERIFIED during
independent execution; only later originating supervised verification grants
VERIFIED. Independent results cannot grant or revoke originating status.

## Supervised verification

Each supervised repetition has a separate isolated originating run and explicit
15-request budget. A supplied deterministic source journey produces real
OBSERVED VIOLATION and independent fresh CONFIRMED evidence on the intentionally
inconsistent fixture (10 requests). The existing minimizer preserves its
three-action verified reproducer; no additional deletions are valid. Export
remains GENERATED / UNVERIFIED.

For repaired acceptance, the owned server is replaced at the same approved
loopback address/port with the identical public contract before verification.
This evaluator-only setup does not change the frozen scope, predicate or manifest,
and never overlaps in-flight execution. The existing T042 verifier then uses the
same originating supervisor and remaining five requests, independently resets and
baselines, and evaluates the exact intended assertion. Total authoritative
consumption is 15: RESET 3, BASELINE 3, EXPLORATION 3, REPLAY 3, ARTIFACT 3.
Faulty runs persist VERIFIED; repaired SATISFIED runs persist UNVERIFIED. Historical
source evidence remains append-only and the CONFIRMED source is not erased.
A separate 14-request run refuses verification at 10 consumed requests, leaving
UNVERIFIED without further target work. No phase-local authorization budget exists.

## Observed verification

- Artifact acceptance tests: **22/22**.
- Focused harness/artifact/standalone/supervisor/dispatch authority checks: **199/199**.
- Full regression: **858/858**, zero failures/skips.
- Typecheck, changed-file ESLint/Prettier and configured-secret scans: PASS.
- Historical T035–T045 evidence, fixtures, authority code and tests: unchanged.
- No live Gemini benchmark, T048 work or T058 optional fixtures were executed/added.
- Known unrelated repository issues remain two lint errors and nine formatting failures.

Reproduction command, with the disposable test database configured separately:

```sh
npm run test:artifacts
```

To retain another observed result, supply `T047_EVIDENCE_FILE` pointing to a new
local output file. The test runner's successful exit and all assertions are
required; the observed-row file alone is not a PASS claim. No manual developer
acceptance remains pending for T047. See [T047 checkpoint](t047.md) and
[validation results](t047-results.json).
