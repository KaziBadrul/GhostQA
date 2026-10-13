# GhostQA Constitution

## Core Principles

### I. Workflow and State Integrity

GhostQA MUST prioritize unusual sequences of individually valid API actions and their
application-state consequences. Endpoint and state mapping MUST distinguish specification facts,
inferred relationships, and observed transitions. Plans MUST express step dependencies and the
invariant or expected behavior under investigation. Input fuzzing MAY complement workflow fuzzing,
but MUST NOT replace the core multi-step exploration capability.

### II. Deterministic Execution and Reproducibility

AI planning and reasoning MUST remain separate from the deterministic request executor. The
executor MUST validate structured plans and apply explicit request, dependency, timeout, and retry
rules; it MUST NOT invent actions from model prose. Execution records MUST retain ordered steps,
resolved inputs, relevant responses, environment references, and configuration sufficient for
replay, subject to secret redaction. Confirmed findings MUST provide a reproducible sequence and a
regression test. Minimization MUST recheck the same failure predicate and report its stopping
criteria; a sequence MUST NOT be called globally shortest without evidence for that claim.

### III. Evidence Before Confirmation

Findings MUST distinguish observed violation, confirmed, inconclusive, and non-reproduced outcomes.
A model explanation alone MUST NOT confirm a bug. Confirmation MUST use an explicit failure
predicate supported by recorded observations and a reproducibility check. Reports MUST separate
observed facts from inferred causes and disclose missing evidence. State inference, adaptive
planning, and generated tests MUST NOT fabricate application guarantees or claim unmeasured
coverage. Regression tests MUST assert the intended invariant rather than merely reproduce an
unexpected response.

### IV. Bounded and Isolated Execution

Every run MUST use an explicitly configured target scope and enforce request, time, and journey
budgets. The executor MUST reject out-of-scope requests, including redirects, and MUST support
cancellation that stops scheduling further work. Credentials and execution records MUST be
isolated by project and access policy; secrets MUST be redacted from user-facing traces, exports,
and logs. Cleanup and environment reset requirements MUST be explicit for reproducibility checks
and minimization. Autonomous adaptation MUST remain within the configured scope and budgets.
These controls make adversarial exploration operationally predictable.

### V. Developer Clarity and Verifiable Quality

The web interface MUST make run status, progress, findings, and ordered execution traces readable
and distinguish inferred state from observed evidence. Critical workflows MUST support keyboard
operation, visible focus, and status indicators that do not depend on color alone. Density MUST
serve inspection without obscuring actions or results. Changes to parsing, execution, detection,
minimization, or regression generation MUST include meaningful automated verification of their
behavior and failure paths. Tests MUST exercise observable contracts rather than mirror internals.

## Product and Architecture Constraints

- The MVP scope is OpenAPI import, endpoint/state mapping, autonomous planning, deterministic API
  execution, adaptive journeys, failure detection, sequence minimization, reproducible reports,
  and regression-test generation. Specifications MUST identify the subset they deliver.
- The platform is web. Next.js with TypeScript, FastAPI, and PostgreSQL are recommendations pending
  adoption, not mandated dependencies. Stack adoption MUST be recorded in the implementation plan
  with its rationale. Background infrastructure and deployment remain open decisions.
- Model outputs, imported specifications, and target responses MUST be treated as untrusted data.
  They MUST NOT become executable host commands or override executor policy.
- PRODUCT.md supplies product context. DESIGN.md is visual inspiration that MUST be adapted to
  GhostQA's restrained developer-tool identity. The recorded UI workflow is code-first.
- Specifications MUST resolve relevant open decisions, including authentication, target setup,
  failure predicates, regression-test formats, and execution limits, before dependent work starts.

## Development Workflow and Quality Gates

Each feature specification MUST state user outcomes, scope, acceptance scenarios, and relevant
failure cases. Each implementation plan MUST document compliance with these principles, identify
unresolved dependencies, and justify added services or abstractions. Tasks MUST connect planned
work to acceptance criteria and verification.

Before a change is accepted, relevant automated checks MUST pass and reviewers MUST verify the
applicable constitutional requirements. Integration checks MUST cover changed boundaries between
OpenAPI parsing, planning, execution, evidence analysis, and exported artifacts. Executor changes
MUST test policy enforcement, cancellation, and bounded failure handling where affected.
Confirmation and minimization changes MUST use controlled fixtures with known invariants and
replay outcomes. UI changes MUST verify critical desktop and mobile workflows and applicable
accessibility requirements. Verification results and known limitations MUST be recorded.

Architecture MUST remain as simple as the current requirements permit. New infrastructure MUST
have a documented operational need; speculative future audiences do not justify it alone.

## Governance

This constitution governs GhostQA specifications, plans, implementation, and reviews. Conflicts
with subordinate project guidance MUST be resolved in favor of this constitution or through an
explicit amendment. Implementation convenience MUST NOT silently weaken a principle.

Amendments MUST describe the proposed change, rationale, affected requirements, and migration or
follow-up work. The project owner MUST approve governance changes before adoption. Each amendment
MUST update the version and last-amended date while preserving the original ratification date.
Versions follow semantic versioning: MAJOR for incompatible principle removals or redefinitions,
MINOR for added principles or materially expanded guidance, and PATCH for clarifications that do
not change obligations.

Every feature plan and change review MUST check compliance. Exceptions MUST name the affected
rule, rationale, scope, mitigation, and expiry or removal criterion and receive project-owner
approval before affected work proceeds. Open implementation choices MUST be resolved in feature
specifications or plans without inventing product evidence. This initial constitution is adopted
through the user's constitution command using the confirmed product brief.

**Version**: 1.1.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-10-03


Amendment 1.0.1 (2026-10-01, approved by the project owner): the initial eligible predicate-violation classification is named OBSERVED VIOLATION. This is a vocabulary change; confirmation still requires independent fresh-state replay. Historical immutable evidence remains unchanged, with append-only migration history where derived current labels are renamed. The accepted feature specification also extends account reset-token invalidation to both email and password changes.

Amendment 1.1.0 (2026-10-03, approved by the project owner's explicit pivot implementation
request): add OpenAPI-to-MCP generation as the primary new product flow. Workflow fuzzing,
evidence confirmation, fresh-state and run-supervisor obligations continue for fuzzing runs.
They do not apply to deterministic package conversion or later standalone MCP developer calls.
The generated package uses a fixed destination, schema validation, bounded requests, redirect
rejection and environment credentials. Models may process documentation only and cannot modify
execution authority. Existing engine and evidence remain preserved. Feature 002 records scope,
acceptance and implementation. This scoped expansion supersedes the old MVP scope exclusion.
