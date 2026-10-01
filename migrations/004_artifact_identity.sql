-- Artifact bytes and generation identity are immutable. Verification metadata
-- advances with append-only audit references; project cascade deletion remains.
CREATE FUNCTION protect_artifact_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE i integer;
BEGIN
  IF NEW.id<>OLD.id OR NEW.finding_id<>OLD.finding_id OR NEW.format<>OLD.format
     OR NEW.content_hash<>OLD.content_hash OR NEW.runner_version<>OLD.runner_version
     OR NEW.content<>OLD.content OR NEW.generated_at<>OLD.generated_at THEN
    RAISE EXCEPTION 'Immutable artifact identity';
  END IF;
  IF jsonb_typeof(NEW.evidence_refs)<>'array'
     OR jsonb_array_length(NEW.evidence_refs)<jsonb_array_length(OLD.evidence_refs) THEN
    RAISE EXCEPTION 'Append-only artifact evidence';
  END IF;
  FOR i IN 0..jsonb_array_length(OLD.evidence_refs)-1 LOOP
    IF NEW.evidence_refs->i IS DISTINCT FROM OLD.evidence_refs->i THEN
      RAISE EXCEPTION 'Append-only artifact evidence';
    END IF;
  END LOOP;
  IF OLD.verification_status='VERIFIED' AND NEW.verification_status<>'VERIFIED' THEN
    RAISE EXCEPTION 'Historical artifact verification';
  END IF;
  IF OLD.verification_status='UNVERIFIED' AND NEW.verification_status='VERIFIED'
     AND NOT EXISTS(SELECT 1 FROM evidence e JOIN findings f ON f.id=NEW.finding_id
       JOIN evidence p ON p.id::text=e.evaluation->'evidence'->>'id'
       WHERE e.run_id=f.run_id AND e.kind='ARTIFACT VERIFICATION'
       AND e.evaluation->>'artifactId'=NEW.id::text
       AND e.evaluation->>'manifestHash'=NEW.content_hash
       AND e.evaluation->>'verified'='true'
       AND e.evaluation->'provenance'->>'authority'='SUPERVISED_RUN_PATH'
       AND p.kind='PREDICATE' AND p.run_id=e.run_id AND p.trial_id=e.trial_id
       AND p.evaluation->>'phase'='ARTIFACT' AND p.evaluation->>'outcome'='VIOLATED'
       AND NEW.evidence_refs @> jsonb_build_array(e.id::text,p.id::text)) THEN
    RAISE EXCEPTION 'Supervised artifact evidence required';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_artifact_identity BEFORE UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION protect_artifact_identity();
CREATE TRIGGER immutable_artifact_delete BEFORE DELETE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION protect_history_delete();
