# Minimum usable product validation

Validation performed October 3, 2026. This is product implementation evidence, not a replacement for Gate 5 benchmark acceptance.

Implemented: persisted projects and normalized OpenAPI snapshots; target/limit/exclusion configuration; versioned encrypted bearer/API-key credentials; declarative reset/baseline checks; immutable developer invariants with explicit approval; expiring resolved-address scope previews; asynchronous supervised execution; cancellation; interruption recovery without replay; sanitized traces; report and standalone-runner downloads.

Live configured Gemini demonstrations:

| API       | Run                                  | Finding   | Artifact | Target requests |
| --------- | ------------------------------------ | --------- | -------- | --------------- |
| Orders    | d5fac075-3220-46ee-9a72-d7489c4c3d46 | CONFIRMED | VERIFIED | 15              |
| Inventory | 9b88b56c-a06f-45e2-913e-e0ebbe46fccc | CONFIRMED | VERIFIED | 15              |
| Workflow  | dba2d21d-49e5-43ae-9cbe-2980648c0a2a | CONFIRMED | VERIFIED | 15              |

HTTP end-to-end custom project: 5e1f6738-6cbe-4b91-be15-5ad563c8ed20. Run 1ee4e7bc-8771-4020-99d2-4f9b56a5f6ae completed with CONFIRMED finding and VERIFIED artifact. Save/import/target/reset/invariant approval/scope approval/start/trace/Markdown/JSON/bundle/reopen all succeeded through application routes.

The order demo initially rejected an invalid proposed mapping UUID before target dispatch. Explicit UUID guidance was clarified while retaining strict validation. Historical runs also contained provider HTTP 400 diagnostics. Fresh current-adapter runs succeeded; model output quality and provider failures can still stop individual future runs.

Production build and TypeScript checks passed. The final non-overlapping full regression run passed all 907 tests across 67 files. Affected suites (43 tests) passed sequentially, including encrypted project persistence, missing/stale/expired approvals, phase conflicts, cancellation, crash recovery without replay, supervised reproduction/export, application origin/host/token checks, bounded input and sanitized errors, and sole target-dispatch import authority. Browser inspection displayed a successful demo's confirmed evidence and downloads; native browser navigation was unreliable for the new setup page, so comprehensive visual/mobile/accessibility acceptance is still outstanding.
