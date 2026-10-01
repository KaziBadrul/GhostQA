-- Rename the derived current state; preserve immutable historical evidence and
-- transitions. An append-only transition makes the vocabulary change auditable.
ALTER TABLE findings DROP CONSTRAINT findings_current_classification_check;
INSERT INTO finding_transitions(id,finding_id,prior_classification,next_classification,evidence_refs,reason)
SELECT gen_random_uuid(),id,'SUSPICIOUS','OBSERVED VIOLATION',jsonb_build_array(initial_evidence_id),
       'CLASSIFICATION LABEL RENAME; EVIDENCE UNCHANGED'
FROM findings WHERE current_classification='SUSPICIOUS';
UPDATE findings SET current_classification='OBSERVED VIOLATION' WHERE current_classification='SUSPICIOUS';
ALTER TABLE findings ADD CONSTRAINT findings_current_classification_check
CHECK(current_classification IN ('OBSERVED VIOLATION','CONFIRMED','INCONCLUSIVE','NON-REPRODUCED'));
