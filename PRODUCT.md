# GhostQA

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

User delegated a stack recommendation. Recommended, pending adoption: Next.js with TypeScript for the web interface, FastAPI for Python API and agent services, and PostgreSQL for persistent projects, journeys, and execution records. No application stack is implemented yet. Background execution infrastructure and deployment target remain undecided.

## Users

Primary users are solo developers, indie hackers, and startup engineering teams. QA and security teams are an eventual audience.

Users need to discover application failures beyond the workflows they already expect and routinely test.

## Product Purpose

GhostQA is an autonomous adversarial API testing platform. It discovers unusual sequences of individually valid API actions that can put an application into an invalid or unexpected state.

Success means a confirmed failure can be understood, reproduced from a minimized sequence, and captured as a regression test.

## Positioning

Workflow fuzzing rather than only input fuzzing. GhostQA explores multi-step API journeys and application state transitions, combining AI planning and reasoning with deterministic request execution.

GhostQA should feel like a serious developer tool.

## Operating Context

1. A user creates a project and imports an OpenAPI specification.
2. GhostQA parses endpoints and inferred application states.
3. An AI planning agent generates unusual multi-step API journeys.
4. A deterministic executor performs requests and records responses and state transitions.
5. A reasoning agent analyzes observed violations and adapts its strategy.
6. Confirmed failures are minimized into the shortest reproducible sequence.
7. GhostQA produces a bug report and regression test.

An illustrative journey is: create account → request password reset → change email → use old reset token → old token unexpectedly succeeds. This is a product example, not evidence of a discovered vulnerability.

## Capabilities and Constraints

The intended MVP includes:

- OpenAPI import and endpoint/state mapping.
- Autonomous test-plan generation and API execution.
- Adaptive journey generation and failure detection.
- Sequence minimization.
- Reproducible bug reports and regression-test generation.

These are planned capabilities; the repository currently contains no application implementation.

Open decisions include authentication and target-environment setup, failure confirmation criteria, supported regression-test formats, execution limits, deployment, and commercial terms.

## Brand Commitments

The product name is GhostQA. Its interface should be technical, restrained, dense where useful, minimally decorated, and grounded in excellent typography and strong hierarchy. Test results and execution traces must be highly readable.

Use DESIGN.md as visual inspiration, adapting it to GhostQA rather than copying Spotify literally. This product record does not define a replacement visual system.

## Evidence on Hand

- The user-confirmed product brief supplies the intended workflow, MVP, audience, and illustrative password-reset journey.
- DESIGN.md contains existing Spotify-inspired visual reference material.
- No implemented product, verified failure demonstrations, customer testimonials, benchmarks, pricing, or case studies have been established. Future work must not present invented evidence as fact.

## Product Principles

- Explore unexpected combinations of valid actions and their state consequences.
- Keep AI planning and reasoning distinct from deterministic execution.
- Make findings reproducible through minimized sequences and regression tests.
- Prioritize clear results and execution traces so developers can understand and act on failures.
- Distinguish observed violations from confirmed failures.

## Current product direction (owner-approved 2026-10-03)

The primary new flow is OpenAPI + notes → select tools → download a Node stdio MCP server →
read documentation → connect an application's backend. See `specs/002-openapi-mcp/spec.md`.
The implemented stack is Next.js, React, strict TypeScript and PostgreSQL. The earlier stack
recommendation and statements that no application exists are historical. The fuzzing engine
remains available; its reset/invariant setup is separate from MCP conversion.
