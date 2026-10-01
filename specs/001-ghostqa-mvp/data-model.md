# Persistence and data model

PostgreSQL UUID primary keys, timestamptz timestamps, parameterized SQL, numbered migrations.
JSONB holds versioned structured contracts; do not split every assertion or binding into tables.
Every record has project_id or an ownership path enforced by repository queries/FKs, despite
single-user operation. Project deletion is transactional, disallowed while its run is active,
and deletes its credential versions and evidence. No tenant/user table or hosted authentication.

| Entity / table | Fields and relations | Invariants |
| --- | --- | --- |
| Project / projects | id, name, target_template JSONB, created_at, updated_at | Mutable draft settings only; active snapshot unaffected by edits. |
| SpecificationSnapshot / specifications | id, project_id, sanitized_document JSONB, sanitized_hash, openapi_version, api_model JSONB, diagnostics JSONB | Append-only; raw unsanitized specification never persisted; same hash included in runs. |
| Credential / credentials | id, project_id, slot_name, version, ciphertext, nonce, auth_tag, key_id, created_at | AES-GCM encrypted; separate key; immutable version, replacement adds version. No value-return endpoint. |
| Predicate / predicates | id, project_id, version, canonical_hash, definition JSONB, source_ref | Unique id/version; immutable conjunction profile. |
| Approval / approvals | id, project_id, kind, subject_hash, approved_at, details JSONB | Immutable owner decision; eligible predicate references approval separately, so semantic identity never changes. |
| ResetConfiguration / resets | id, project_id, version, reset_steps/check_steps/assertions JSONB | At most ten reset/check requests each; required baseline assertions nonempty. |
| Run / runs | id, project_id, status, stop_reason, accepted_at, deadline_at, immutable_snapshot JSONB, counters JSONB, cancel_at, model_config JSONB | Snapshot includes scope/approved IPs/operations, API/reset/predicate versions, credential slot/version refs, limits and generation bounds; no credential values. One active global run. |
| Journey / journeys | id, run_id, kind/phase, parent_journey_id, definition JSONB, normalized_hash, ordinal | Immutable step/variable definitions; at most ten journey steps. |
| JourneyStep / step_records | id, run_id, journey_id, trial_id, step_name, phase, ordinal, request_intent_at, sanitized_request/response JSONB, outcome, error_reason, timing | Intent consumes budget before dispatch; final observation appended, never hides interrupted intent. No raw body/header/token columns. |
| StateVariable | Embedded declarations in journey JSONB; runtime values in ephemeral trial store | Sources/extraction/type/taint/symbol retained; raw issued secret values not persisted. |
| Observation / observations | id, run_id, trial_id, step_record_id, sanitized_summary JSONB, provenance_mappings JSONB | Observed state requires evidence; agent hypotheses not observed state. |
| BaselineResult | Evidence row of BASELINE kind with reset/check step refs, outcomes, trial_id | Exactly one immediately following trial; no stale reuse. |
| Evidence / evidence | id, run_id, trial_id, kind/phase, predicate_ref/hash, baseline_id, step_refs JSONB, evaluation JSONB, created_at | Append-only predicate results and symbolic operands; missing content cannot be claimed evaluated. |
| Finding / findings | id, project_id, run_id, predicate_ref, initial_evidence_id, original/minimized_journey_id, current_classification, consistent, minimization_stop | Derived view of append-only evidence/transitions; never LLM-authored classification. |
| FindingTransition / finding_transitions | id, finding_id, prior/next classification, evidence_refs JSONB, reason, created_at | Pure reducer validates every transition; contradictory later replay flagged. |
| ExportArtifact / artifacts | id, finding_id, format, content_hash, runner_version, sanitized_manifest/report/bundle bytes, generated_at, verification_status, evidence_refs JSONB | VERIFIED tied to exact manifest/package hashes and supervised-path evidence; no independent-runner authority or credential capture. |

Minimal indexes: project foreign keys, runs(status), journeys(run_id,ordinal),
step_records(run_id,trial_id,ordinal), evidence(run_id,trial_id), findings(run_id),
unique predicates(id,version), credentials(project_id,slot_name,version), and content hashes.
Use FK cascades for project-owned data and transactions for deletion. Database roles permit only
application operations, not shared public access. DB unavailable before dispatch => stop, not
in-memory continuation. A watchdog recovers interrupted run records after worker/process death.

State machines:

- Run: ACCEPTED → RUNNING → STOPPING → STOPPED, or RUNNING → COMPLETED; process loss → INTERRUPTED.
  Stop reason is explicit: DISCOVERY COMPLETE, STAGNATION, JOURNEY LIMIT, BUDGET EXHAUSTED,
  TIME EXHAUSTED, CANCELLED, MODEL ERROR, MODEL PLAN ERROR, BASELINE ERROR, EXECUTION ERROR,
  STORAGE ERROR. No transition back into RUNNING.
- Predicate evaluation: SATISFIED/VIOLATED/NOT APPLICABLE/UNEVALUABLE from immutable definition.
- Finding: initial VIOLATED → OBSERVED VIOLATION; missing eligibility/evidence → INCONCLUSIVE;
  fresh eligible replay VIOLATED → CONFIRMED; applicable SATISFIED → NON-REPRODUCED.
  NOT APPLICABLE/UNEVALUABLE replay → INCONCLUSIVE. Late approval starts a new bounded run,
  not a resurrection. New predicate version requires new initial trial. Later contradictory
  evidence keeps history and marks consistent=false; current presentation cannot claim a
  consistently confirmed bug until a new initial+replay confirmation attempt succeeds.
- Artifact: generated content with UNVERIFIED → VERIFIED only after exact-manifest failing
  assertion through the originating run’s supervisor-owned dispatch path.
  Edited bytes create a new artifact and restart verification. Finding confirmation is independent.

The network/specification/predicate/reset snapshots remain immutable even when a project changes.
Credential key material and issued tokens never enter these snapshots. Redaction retains enough
symbolic structure to re-extract fresh values, not enough to reveal old secrets.

Dispatch accounting is owned by the supervisor's sole BudgetManager; database counters are its
persisted audit record, never phase-local admission counters. Evidence for artifact verification
records originating run ID, manifest hash, baseline and supervised dispatch provenance. Exported
runner results cannot write these records. Cancellation, advisory-lock loss and shutdown prevent
new intents from dispatching; uncertain in-flight intents retain conservative budget accounting.
