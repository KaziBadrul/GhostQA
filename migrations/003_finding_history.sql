-- Direct deletion cannot erase verification history. Parent/project cascade
-- deletion remains supported by the accepted project lifecycle.
CREATE FUNCTION protect_history_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() = 1 THEN RAISE EXCEPTION 'Immutable record'; END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER immutable_evidence_delete BEFORE DELETE ON evidence FOR EACH ROW EXECUTE FUNCTION protect_history_delete();
CREATE TRIGGER immutable_transition_delete BEFORE DELETE ON finding_transitions FOR EACH ROW EXECUTE FUNCTION protect_history_delete();
CREATE TRIGGER immutable_finding_delete BEFORE DELETE ON findings FOR EACH ROW EXECUTE FUNCTION protect_history_delete();
CREATE FUNCTION protect_finding_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id<>OLD.id OR NEW.project_id<>OLD.project_id OR NEW.run_id<>OLD.run_id
     OR NEW.predicate_ref<>OLD.predicate_ref OR NEW.initial_evidence_id<>OLD.initial_evidence_id
     OR NEW.original_journey_id<>OLD.original_journey_id THEN
    RAISE EXCEPTION 'Immutable finding identity';
  END IF;
  IF NOT OLD.consistent AND NEW.consistent THEN RAISE EXCEPTION 'New initial finding required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_finding_identity BEFORE UPDATE ON findings FOR EACH ROW EXECUTE FUNCTION protect_finding_identity();
