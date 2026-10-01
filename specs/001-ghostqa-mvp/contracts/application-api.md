# Local application interface contract

Node route handlers validate strict Zod input and project ownership, then invoke repositories or
supervisor commands. Bind server to 127.0.0.1 by default; reject unexpected Host/Origin and cross-
origin mutations; require same-origin anti-CSRF nonce on writes. No public multi-user API. Never
return credential values. Consistent error envelope `{code, message, details, requestId}` is sanitized;
400 invalid input, 404 missing project, 409 busy/stale snapshot/approval, 422 unsupported setup,
503 storage/model availability. Model/target failures inside a run are recorded outcomes, not
an HTTP request that remains open for the whole run.

| Method / path | Input | Output / authority |
| --- | --- | --- |
| POST /api/projects | name, targetTemplate | Project draft; no execution authority. |
| GET /api/projects | none | Project summaries, no secrets. |
| GET/PATCH /api/projects/:id | draft edits | Settings; never mutates historical run snapshots. |
| DELETE /api/projects/:id | explicit deletion confirmation | Remove project-owned data/credentials; reject active project run. |
| POST /api/projects/:id/specifications | bounded JSON/YAML source | Sanitized immutable snapshot, eligible/excluded operations and diagnostics. |
| PUT /api/projects/:id/credentials/:slot | raw secret through same-origin protected request | Version/ref only; encryption required; never echo secret. |
| POST /api/projects/:id/predicates | declarative definition/source | Immutable ID/version/hash; approval separate. |
| POST /api/projects/:id/predicates/:id/approvals | expected version/hash, owner approval | Append-only eligibility approval, not model authorization. |
| PUT /api/projects/:id/reset | reset/check actions and assertions | Versioned validated reset config. |
| POST /api/projects/:id/scope-preview | explicit target, operation set | Canonical scope, DNS addresses, approval hash and expiry (60s), mutation warning. |
| POST /api/projects/:id/runs | snapshot refs, finite limits, scope hash/approval, mutation acknowledgment | 202 accepted Run ID/deadline; supervisor owns sole dispatch authority and worker orchestrates. Expired scope preview rejected. |
| GET /api/runs/:id | event cursor/pagination | Sanitized ordered progress/status/budget/trace deltas. |
| POST /api/runs/:id/cancel | same-origin cancellation command | STOPPING/STOPPED ACK after dispatch disabled; completed effects not undone. |
| GET /api/runs/:id/findings | pagination | Deterministic finding classifications and consistency flags. |
| GET /api/findings/:id | none | Predicate provenance, evidence, baseline/replay/minimization and artifact statuses. |
| POST /api/findings/:id/verification-runs | fresh scope approval/config | New bounded run for later approved candidate; no stopped-run resumption. |
| GET /api/findings/:id/exports/:artifactId | format | Secret-free Markdown/JSON/bundle/manifest, hashes, invocation instructions. |

Application server and engine communicate structured Start/Cancel/Progress/Stopped messages under
Zod validation. Only start commands from approved routes/CLI create execution context. Progress
messages are sanitized before persistence/UI. Scope API has no remote-import URL fetch. Response
pagination and active-run 500ms polling keep interface simple. Later SaaS may wrap these application
commands in auth/access checks without giving model code access to transport authority.

The Cancel acknowledgment requires the supervisor dispatch gate to be closed for every phase.
Advisory-lock connection loss and supervisor shutdown close that same gate without waiting for a
worker message. Start/phase messages cannot recreate it for a stopped run. Artifact verification
is an ordinary supervised phase, with no independent runner invocation or second dispatch worker.
