# GhostQA Agent Instructions

## Project

GhostQA is an autonomous API workflow-fuzzing tool.

Given a web application's API specification and a testing goal, GhostQA explores unusual but individually valid sequences of API operations, observes resulting state changes, detects observed invariant violations, independently reproduces candidate failures, minimizes failing sequences, and produces reproducible bug reports and regression artifacts.

The central hypothesis is:

> Unexpected application bugs can be discovered by fuzzing sequences of valid user actions, not only malformed individual inputs.

Example:

```text
Create account
→ Request password reset
→ Change email (or password)
→ Use old reset token
→ Unexpected success
```

GhostQA is not a general penetration-testing framework, browser automation system, or malformed-input fuzzer.

---

# Authoritative Project Documents

Before making architectural or behavioral changes, read the relevant documents.

Priority:

1. `.specify/memory/constitution.md`
2. `specs/001-ghostqa-mvp/spec.md`
3. `specs/001-ghostqa-mvp/plan.md`
4. `specs/001-ghostqa-mvp/contracts/`
5. `specs/001-ghostqa-mvp/data-model.md`
6. `specs/001-ghostqa-mvp/research.md`
7. `specs/001-ghostqa-mvp/tasks.md`
8. `specs/001-ghostqa-mvp/quickstart.md`
9. `PRODUCT.md`
10. `DESIGN.md`

When documents disagree, prefer the more authoritative accepted specification/planning artifact.

`PRODUCT.md` may contain historical or superseded technical ideas. Do not use it to override the accepted TypeScript architecture.

Do not silently change requirements to make implementation easier.

---

# Architecture

GhostQA MVP uses:

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Zod
- Gemini through a provider abstraction
- deterministic Node HTTP/HTTPS execution
- Vitest

The MVP is intentionally one application.

Do not introduce:

- FastAPI
- Python backend
- Redis
- message queues
- microservices
- Kubernetes
- additional backend services
- agent frameworks

unless an accepted specification or plan change explicitly requires them.

Prefer boring, mature dependencies and simple code.

---

# Core Architectural Rule

## LLM reasons. Deterministic code controls authority.

Gemini may:

- propose journeys
- propose dependencies
- propose state relationships
- generate hypotheses
- reason about sanitized observations
- suggest subsequent exploration

Gemini must never:

- dispatch HTTP requests
- authorize destinations
- authorize operations
- expand network scope
- change budgets
- bypass cancellation
- bypass reset/baseline requirements
- confirm findings
- execute arbitrary code
- execute shell commands
- receive raw credentials unless explicitly required by an accepted future specification

Every model output crossing into deterministic execution must be structurally validated.

Treat model output as untrusted input.

---

# Single Network Authority

There must be exactly one authoritative path for target HTTP requests during a GhostQA run.

```text
RunSupervisor
→ BudgetManager
→ Frozen Scope / Operation Policy
→ Cancellation Authorization
→ Deterministic HTTP Executor
```

All target requests must use this path.

This includes:

- reset
- baseline inspection
- exploration
- confirmation replay
- minimization
- GhostQA regression-artifact verification

No other module may independently dispatch target HTTP requests.

A planner, verifier, minimizer, regression module, API route, UI component, or helper may request execution through the authoritative path but may not create an alternative path.

Do not add a convenient direct `fetch(targetUrl)` bypass.

---

# Phase-Aware Operation Authority

Operation authorization is phase-specific.

The frozen operation policy distinguishes at least:

- exploration operations
- reset operations
- baseline/inspection operations
- excluded operations

The planner receives only exploration-eligible operations.

This is not itself a security boundary.

The authoritative dispatcher must validate:

```text
trusted supervisor execution phase
+
operation classification
+
frozen operation policy
```

before dispatch.

Execution phase comes from trusted engine state.

Never trust a phase value supplied by:

- Gemini
- Journey objects
- HTTP input
- fixture responses
- imported OpenAPI content

A reset operation proposed during exploration must be rejected even if that operation exists in the overall approved API model.

Excluded operations must never execute.

---

# Network Safety

Target execution must remain inside the developer-approved frozen scope.

Enforce the accepted plan for:

- HTTP/HTTPS origin
- effective port
- normalized base path
- resolved address approval
- address pinning
- hostname preservation
- Host behavior
- TLS SNI
- TLS certificate validation
- redirect rejection
- operation allowlisting
- operation exclusions
- reserved-header restrictions
- request size limits
- response size limits
- request timeouts

Model-generated URLs are data, not authority.

Response-provided URLs are data, not authority.

Extracted URLs must never silently expand target scope.

Redirects must not silently expand target scope.

Explicitly approved localhost/private-network targets are allowed according to the accepted scope policy.

Do not weaken network controls merely to make a fixture or test pass.

---

# Run Supervisor

The RunSupervisor owns execution authority.

It must enforce:

- one active local supervisor where specified
- PostgreSQL advisory-lock ownership
- cancellation
- shutdown behavior
- dispatch authorization
- interruption semantics

Loss of supervisor authority or advisory-lock ownership must disable new target dispatch.

Cancellation prevents new dispatch.

Attempt to abort in-flight work where supported, but never claim that target-side effects have been reversed.

Do not automatically replay ambiguous mutating requests.

---

# Budget

There is one authoritative `BudgetManager`.

Do not implement shadow authorization counters.

The same run budget covers target requests made by:

- reset
- baseline inspection
- exploration
- confirmation
- minimization
- GhostQA artifact verification

Failed dispatched requests count.

Rejected local plans do not count as target requests.

Local predicate evaluation does not count as a target request.

Respect:

- request limit
- elapsed-time deadline
- journey limit
- step limit
- model/stagnation limits defined by the specification
- cancellation

A complete trial must be admitted before reset begins when required by the accepted plan.

Do not start a trial that cannot fit within the remaining authoritative budget.

---

# Durable Dispatch

The minimum persistence required for safe dispatch must exist before target execution.

Persist the information required by the accepted plan for:

- run identity
- immutable execution configuration
- frozen scope
- request intent
- budget consumption
- dispatch outcome
- interruption recovery

When dispatch occurred but the outcome is uncertain, account conservatively.

After process restart:

- preserve completed evidence
- mark affected nonterminal runs appropriately
- do not automatically repeat mutations
- do not automatically resume interrupted runs

Later evidence repositories may extend this persistence model but must not become a prerequisite that appears only after network execution has already been implemented.

---

# Fresh-State Rule

Every trial requiring reproducibility starts from independently verified fresh state.

Lifecycle:

```text
Full-trial admission
→ Reset
→ Validate reset
→ Baseline inspection
→ Evaluate baseline assertions
→ Verified baseline
→ Execute trial
```

This applies to:

- exploration
- confirmation replay
- minimization trials
- GhostQA regression-artifact verification

Never reuse baseline evidence from a previous trial.

If reset fails, baseline cannot be evaluated, the baseline is violated, the request times out, or sufficient budget is unavailable:

**do not execute the trial.**

Follow the specification for whether the resulting candidate becomes `INCONCLUSIVE` or the run receives another stop/error outcome.

---

# Predicates and Invariants

Bug confirmation requires an explicit machine-checkable predicate.

Predicates have stable identity and provenance.

Valid provenance includes accepted categories such as:

- explicit specification assertion
- developer-provided invariant
- developer-approved agent hypothesis

An agent hypothesis by itself cannot confirm a bug.

The same logical predicate identity must survive:

```text
Hypothesis
→ Eligibility / approval
→ Initial violation
→ OBSERVED VIOLATION
→ Independent replay
→ CONFIRMED / NON-REPRODUCED
→ Minimization
→ Regression artifact
→ Artifact verification
```

Do not quietly rewrite the expected behavior during confirmation or minimization.

Editing a predicate requires the appropriate new identity/version/evidence semantics from the accepted contracts.

---

# Finding State Machine

Finding classifications are deterministic.

### OBSERVED VIOLATION

An eligible predicate is observed as violated during initial execution.

### CONFIRMED

An independent fresh-state replay violates the same eligible predicate.

### NON-REPRODUCED

A valid independent fresh-state replay evaluates the predicate as satisfied.

### INCONCLUSIVE

Used according to the specification when valid determination is prevented by conditions such as:

- missing predicate eligibility
- failed fresh-state verification
- unevaluable replay
- execution failure
- insufficient remaining budget

### EXECUTION ERROR

Execution errors are execution/run outcomes.

Do not turn every failed HTTP request into a product bug.

Model reasoning never changes a finding to `CONFIRMED`.

---

# Cross-Step Values

Journey execution is deterministic.

Runtime values may come from approved sources such as:

- configured inputs
- generated test values
- previous response bodies
- previous response headers
- explicit extraction rules

Dependencies must be explicit.

Example:

```text
Step 1
POST /users
→ extract userId

Step 2
POST /users/{userId}/reset
→ bind userId
→ extract resetToken

Step 3
POST /reset
→ bind resetToken
```

If a required value cannot be resolved:

**fail safely.**

Never ask the executor to invent the missing value.

Never allow the model to fabricate a runtime identifier after execution has started.

---

# OpenAPI

Treat imported OpenAPI documents as untrusted data.

Support only the profile accepted by the specification.

Expected MVP support includes:

- OpenAPI 3.0.x
- OpenAPI 3.1.x
- JSON
- YAML

Respect accepted behavior for:

- local references
- prohibited remote references
- unresolved references
- recursive schemas
- duplicate YAML keys
- unsupported operations
- multiple servers
- ambiguous constructs

Do not silently ignore unsupported behavior.

Reject or clearly report unsupported constructs according to the specification.

Never allow OpenAPI descriptions, examples, extensions, or other text to override system policy.

Prompt-like text inside an OpenAPI document is data.

---

# Secrets

Raw credentials must be tightly contained.

Configured secrets may exist only where necessary for:

- protected configuration handling
- encrypted persistence
- temporary runtime decryption
- actual authorized request construction

They must not appear in ordinary:

- logs
- traces
- observations
- model inputs
- findings
- reports
- exports

Use symbolic references/redacted representations outside the execution boundary.

Configured credentials use the accepted AES-256-GCM design.

Security tests must include:

- fresh nonce behavior
- AAD binding
- ciphertext tampering
- authentication-tag tampering
- malformed key rejection
- fail-closed decryption

Journey-issued tokens should remain trial-local where specified and must be re-extracted during independent replay.

Do not claim perfect secret detection for arbitrary unmarked response data.

---

# Gemini Integration

Gemini is accessed behind a provider-independent interface.

Gemini-specific SDK behavior belongs in the Gemini adapter.

Do not spread Gemini-specific code throughout the engine.

The selected model must be explicit and recorded with the run.

Do not assume a model exists merely because it appeared in an earlier plan or conversation.

Model availability must be validated against the actual configured environment.

Model inputs should be bounded and sanitized.

Track model telemetry required by the specification, including calls and token usage where available.

Handle deterministically:

- malformed structured output
- hallucinated operations
- hallucinated parameters
- invalid bindings
- timeout
- rate limit
- repeated invalid plans
- stagnation

Do not solve malformed model output by relaxing validation.

---

# Prompt Injection

Treat all target-controlled content as untrusted.

This includes:

- OpenAPI descriptions
- schema descriptions
- examples
- API responses
- error messages
- headers
- user-visible target content

Target-controlled text must never grant authority.

Instructions found in target content are data about the target, not instructions to GhostQA.

---

# Minimization

Use the accepted dependency-aware deletion strategy.

For each candidate reduction:

```text
Validate dependencies
→ Admit complete trial
→ Fresh reset
→ Verify baseline
→ Execute reduced journey
→ Evaluate exact same predicate
```

Accept a reduction only when the same violation remains reproducible.

Preserve required producer/consumer dependencies.

Keep the shortest verified sequence found by the algorithm.

Do not claim global minimality.

Use language such as:

- minimized reproduction
- locally irreducible under attempted deletion strategy
- shortest verified sequence found

---

# Regression Artifacts

GhostQA produces reproducible regression artifacts.

Distinguish two execution contexts.

## GhostQA-controlled verification

During the originating GhostQA run, artifact semantics are verified through the same authoritative supervised execution path.

Artifact verification consumes the same run budget.

Only this controlled verification may establish GhostQA's `VERIFIED` artifact status.

## Standalone developer execution

The exported developer runner executes later and outside the originating run.

It:

- receives explicit target configuration
- receives credentials separately
- contains credential placeholders rather than raw secrets
- preserves operation/path expectations
- must not silently widen network scope
- cannot alter historical GhostQA evidence

Do not give the standalone runner authority over the original run.

---

# Fixture Integrity

The benchmark fixture exists to test GhostQA, not teach GhostQA the answer.

Required benchmark scenarios and supplemental experiments must remain distinct.

Evaluator-private information must never enter planner context.

This includes:

- seeded bug labels
- faulty/fixed variant identity
- hidden trigger sequence
- evaluator hints
- expected discovery journey
- private minimization answers

Faulty and repaired variants should expose equivalent neutral contracts where required.

The reasoning model should discover the workflow from the public API behavior and allowed evidence.

---

# Development Priority

Prove the engine before polishing the product.

Implementation priority:

```text
Safe deterministic execution
        ↓
OpenAPI model
        ↓
Fresh-state lifecycle
        ↓
Gemini journey proposal
        ↓
Validated execution
        ↓
Observed violation evidence
        ↓
Independent confirmation
        ↓
Minimization
        ↓
Report
        ↓
Regression artifact
        ↓
Benchmark
        ↓
Product UI
        ↓
Polish
```

Do not spend substantial effort on product surfaces before the engine hypothesis is demonstrated.

---

# Implementation Gates

## GATE 1 — SAFE EXECUTION READY

Before real controlled target execution:

- runtime contracts work
- durable dispatch persistence exists
- BudgetManager works
- RunSupervisor works
- phase-aware operation policy works
- cancellation works
- network scope enforcement works
- secret handling works
- OpenAPI pipeline works
- fresh-state admission works
- deterministic executor safety tests pass

## GATE 2 — AUTONOMOUS DISCOVERY PROVEN

Live Gemini planning against the password-reset fixture must autonomously produce valid OBSERVED VIOLATION evidence.

Do not provide seeded bug instructions to Gemini.

## GATE 3 — CONFIRMATION PROVEN

Independent verified-fresh replay must produce valid CONFIRMED evidence for the same eligible predicate.

## GATE 4 — REPRODUCTION PIPELINE PROVEN

The following must work end to end:

- minimization
- Markdown/JSON reporting
- regression artifact generation
- GhostQA-controlled artifact verification

## GATE 5 — ENGINE MVP ACCEPTED

Run the required benchmark before broad UI development.

Evaluate accepted engine-level thresholds.

If the core benchmark fails, investigate the engine rather than hiding the failure behind UI work.

## GATE 6 — PRODUCT ACCEPTANCE

Complete:

- product UI
- usability validation
- accessibility validation
- final hardening
- documentation reconciliation

---

# Testing Rules

Prefer test-first implementation for deterministic core behavior.

Every important security or authority rule requires an automated regression test.

Tests should cover at least:

### Unit

- contracts
- budget
- operation policy
- URL/scope validation
- secret redaction
- encryption
- variable resolution
- predicate evaluation
- finding transitions
- minimization

### Contract

- OpenAPI parsing/profile
- Gemini structured outputs
- application API contracts
- regression manifests

### Integration

- fixture reset/baseline
- executor
- fresh-state lifecycle
- observed violation → replay → confirmed
- minimization
- artifact verification
- cancellation
- crash/interruption behavior

### Security regression

- scope escape
- redirect escape
- forged phase
- hallucinated operation
- control operation during exploration
- reserved headers
- malicious OpenAPI text
- malicious response text
- credential leakage
- oversized input/output
- cancellation races

Do not weaken tests to make implementation pass.

Fix the implementation or explicitly identify an invalid requirement/assumption.

---

# Coding Standards

Use strict TypeScript.

Avoid `any`.

At untrusted boundaries:

- parse
- validate
- normalize
- reject unexpected fields where required

Prefer:

- small explicit modules
- pure deterministic functions
- discriminated unions
- immutable configuration snapshots
- explicit state transitions
- dependency injection at external boundaries

Avoid:

- giant service classes
- hidden global state
- magic strings
- duplicated policy logic
- duplicated budget logic
- duplicated finding-transition logic
- speculative abstractions
- unnecessary generic frameworks

Security-critical decisions should be easy to locate and test.

---

# Error Handling

Do not hide failures with broad `try/catch`.

Errors should preserve enough structured context to determine:

- what failed
- which phase failed
- whether dispatch occurred
- whether budget was consumed
- whether target state may have changed
- whether the finding remains evaluable

Never convert uncertain execution into success.

Never retry mutating operations automatically after ambiguous execution.

---

# Database

Use PostgreSQL according to the accepted plan.

Do not introduce an ORM unless the plan is explicitly changed.

Use parameterized queries.

Migrations must be explicit and versioned.

Persist enough immutable run context to reproduce and audit findings.

Do not persist raw decrypted credentials in normal evidence tables.

---

# UI

GhostQA is a developer tool, not a chatbot.

The primary UI should expose structured execution information:

- what GhostQA is trying
- which operation is executing
- why the journey was proposed
- relevant extracted state
- observations
- observed invariant violations
- verification status
- minimal reproduction
- evidence
- regression artifact

Use `DESIGN.md` as the visual reference.

Avoid generic AI SaaS aesthetics.

Do not add decorative complexity before the engine works.

---

# Scope

The MVP explicitly does not include:

- browser automation
- visual testing
- load testing
- general penetration testing
- GitHub integration
- CI/CD integration
- billing
- teams
- public multi-tenancy
- enterprise administration
- Kubernetes
- microservices
- Redis
- queues
- arbitrary shell execution
- arbitrary user scripts
- plugin architecture

Do not implement these opportunistically.

---

# Working With tasks.md

Implement tasks in dependency order.

Before starting a task:

1. Read the task.
2. Read its prerequisites.
3. Read the referenced specification/contract.
4. Inspect existing implementation.
5. Confirm the previous gate has not been violated.

During implementation:

1. Make the smallest coherent change.
2. Add/update tests.
3. Run relevant tests.
4. Fix root causes rather than masking failures.
5. Avoid unrelated refactoring.

After implementation:

1. Run the task's verification.
2. Report failures accurately.
3. Do not mark incomplete work complete.
4. Do not weaken requirements merely to advance to the next task.

If implementation reveals that an accepted architectural assumption is invalid, stop and report the conflict rather than silently redesigning the system.

---

# Agent Behavior

When working autonomously:

- inspect before editing
- make evidence-based decisions
- preserve accepted architecture
- keep changes scoped
- run tests frequently
- report uncertainty
- distinguish observed behavior from inference
- never claim tests passed unless they actually ran and passed
- never claim a security property without an enforceable implementation and test
- never claim benchmark success before benchmark execution

Do not optimize for appearing finished.

Optimize for producing a GhostQA implementation whose findings can be trusted.

---

# Definition of MVP Success

The core MVP succeeds when GhostQA can take the controlled benchmark API and autonomously:

```text
Import OpenAPI
→ understand allowed actions
→ propose an unusual valid workflow
→ execute it safely
→ observe a predicate violation
→ mark it OBSERVED VIOLATION
→ independently reproduce it from fresh state
→ mark it CONFIRMED
→ minimize the sequence
→ generate reproducible evidence
→ generate a regression artifact
→ verify that artifact
```

and do so repeatedly under the acceptance thresholds defined in the specification.

That proof matters more than feature count.

# Owner-approved OpenAPI → MCP pivot (2026-10-03)

The primary new product flow is governed by `specs/002-openapi-mcp/spec.md` and its plan.
The existing engine and its accepted requirements remain preserved. Conversion and exported
standalone MCP servers do not constitute GhostQA fuzzing runs; reset, baseline, predicates,
supervisor persistence and run budgets are not prerequisites for this flow. Notes are documentation
only. Generated execution remains deterministic, schema validated, destination bounded and
credential isolated. The previous MVP plugin exclusion does not prohibit generating MCP servers.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
