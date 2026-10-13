CREATE TABLE application_runs (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  presentation jsonb NOT NULL,
  report_markdown text,
  report_json jsonb,
  bundle jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_runs_project ON application_runs(project_id,created_at DESC);
