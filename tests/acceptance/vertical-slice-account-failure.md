# T035 — Controlled account-workflow acceptance

**Gate 2 result: FAILED / blocked. T035 remains unchecked.**

On 2026-10-01 the existing supervised CLI attempted a live Gemini proposal
against a newly started repository-owned account fixture. The provider returned
MODEL ERROR before reset or exploration. No SUSPICIOUS candidate was produced.
T036 and subsequent dependent acceptance work were not started.

## Recorded run

- Run: `c683bb65-6fcb-4024-9146-35766c40f1de`.
- Provider/model: `gemini` / `gemini-3.5-flash-lite`.
- Separate actual model lookup: available, version `3.5-flash-lite-07-2026`.
- Accepted: `2026-10-01T08:39:57.510Z`; deadline: `2026-10-01T08:49:57.510Z`.
- Terminal status: STOPPED; reason: MODEL ERROR.
- Model calls in the run: 1. Input tokens: estimated 1,354; output usage unavailable.
- Journey: none produced or executed. Baseline: none established.
- Predicate verdict: none. Candidate classification: none.
- Target requests: 0 in every phase; exploration journeys: 0.
- Bounds: 200 requests, 600 seconds, one exploration journey, ten steps,
  ten-second request timeout, thirty-second model timeout.
- Frozen target: `http://127.0.0.1:57383/api`, pinned `127.0.0.1`.
- Scope approval: `0448d264-0cd3-4025-ba4e-075b24ea9e41`.
- Planning result evidence: `1832139c-2247-479b-9422-4a1ddaf0fdd2`.
- Approved developer predicate: `66647786-3fa3-42da-9041-c3357e429016`,
  version 1, hash `f21e37fe913b62db41e9c8e4f83cb480df4635c4403de10b3a30d8e958865b2e`.

The complete sanitized database snapshot, including exact planning context,
predicate definition and telemetry, is in
[vertical-slice-failed.json](vertical-slice-failed.json).
There are no configured credential bindings or configured inputs. No raw API key
or database connection string is included.

## Failure diagnosis

The first launch could not bind port 4010 (EADDRINUSE); it made no provider or
target requests. The acceptance harness then started its own fixture on an
OS-assigned loopback port and froze/approved that exact port. It did not connect
to the pre-existing listener.

After the failed supervised run, a read-only Gemini model lookup succeeded.
A separate provider-only diagnostic passed the identical stored sanitized
planning context to the existing adapter and returned HTTP 400 INVALID_ARGUMENT
("Request contains an invalid argument"). This diagnostic made no target requests
and is separate from the originating run's model counter. The provider did not
identify the invalid argument. A response-schema/SDK request incompatibility is
possible but **not established**. No canned journey, validation relaxation,
model substitution or expected discovery sequence was used to bypass the failure.

## Fixture and authority integrity

`scripts/t035-acceptance.ts` starts `fixtures/api/server.ts`, creates a distinct
acceptance project and fresh run/scope IDs, refreshes the deadline, and invokes
`src/cli/vertical-slice.ts --approve-scope`. It closes its fixture afterward and
preserves durable run evidence. The private faulty variant selection stays in
the evaluator harness. Planner context contains only public exploration
operations, declared mappings, the approved invariant and bounded limits;
it contains no reset operations, variant identity, private fixture metadata or
evaluator-authored journey. All target execution remains behind RunSupervisor.

The run's zero dispatch records establish that this failed attempt sent no target
requests. It provides no evidence of a valid baseline, invariant violation,
successful workflow discovery, confirmation, minimization or artifact verification.

## Verification

Before the live attempt, the full suite passed on Node 24.21.0 with PostgreSQL:
**428 passed, 0 failed, 0 skipped**. This includes actual guarded SQL and loopback
fixture integration for T034. Database migrations succeeded. Typecheck passed.
The acceptance harness reports failure when no SUSPICIOUS candidate exists.

Final typecheck passes. Full lint fails on two existing explicit `any` annotations
in `src/engine/mapping/state.ts` (lines 49 and 52); it also reports an unused
`JsonSchema` import in `src/engine/planning/gemini.ts`. Full formatting check
reports 13 existing files, including `acceptance-config.json` and engine/test
files untouched by this task. These failures are not reported as passes or
silently repaired as unrelated changes. The new harness and acceptance artifacts
pass their focused lint/format checks.

Commands:

```sh
npm run db:migrate
TEST_DATABASE_URL=postgresql://kazibadrul@127.0.0.1:55432/postgres npm test -- --reporter=json --outputFile=/private/tmp/ghostqa-t035-tests.json
npm exec -- tsx scripts/t035-acceptance.ts
npm run typecheck
```

Use the configured local environment separately; credentials are never command
arguments. Gate 2 requires a new successful supervised live run after the provider
request failure is resolved. The failed historical run must remain unchanged.
