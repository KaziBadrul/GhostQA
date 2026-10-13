import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="landing-hero">
      <div className="hero-wash" aria-hidden="true" />
      <div className="hero-copy">
        <h1>
          Your endpoints work.
          <br />
          <span>What about the workflow?</span>
        </h1>
        <p>
          Find the bugs hiding between API calls. GhostQA explores unexpected
          sequences of valid actions, replays violations, and turns confirmed
          failures into reproducible evidence.
        </p>
        <div className="landing-actions">
          <Link className="landing-primary" href="/projects/new">
            Import OpenAPI <span aria-hidden="true">↗</span>
          </Link>
          <Link className="landing-secondary" href="/runs/new">
            Try a demo run
          </Link>
        </div>
        <p className="hero-note">
          OpenAPI 3.0 / 3.1 · JSON or YAML
          <br />
          Import your API to review its operations. Demo APIs are ready to run.
        </p>
      </div>
      <div
        className="workflow-preview"
        aria-label="Illustrative API workflow, not a live finding"
      >
        <div className="preview-header">
          <span>Workflow explorer</span>
          <span className="preview-tag">Illustrative sequence</span>
        </div>
        <div className="preview-intro">
          A valid request can still be the wrong next move.
        </div>
        <ol className="workflow-steps">
          <li>
            <span className="step-node">1</span>
            <div>
              <span className="method">POST</span>
              <code>/accounts</code>
              <small>Create an account</small>
            </div>
            <span className="response-code">201</span>
          </li>
          <li>
            <span className="step-node">2</span>
            <div>
              <span className="method">POST</span>
              <code>/password-reset</code>
              <small>Request a reset token</small>
            </div>
            <span className="response-code">200</span>
          </li>
          <li>
            <span className="step-node">3</span>
            <div>
              <span className="method patch">PATCH</span>
              <code>/accounts/&#123;id&#125;</code>
              <small>Change the account email</small>
            </div>
            <span className="response-code">200</span>
          </li>
          <li className="workflow-question">
            <span className="step-node">4</span>
            <div>
              <span className="method">POST</span>
              <code>/password-reset/confirm</code>
              <small>Can the old token still be used?</small>
            </div>
            <span className="question-mark">?</span>
          </li>
        </ol>
        <div className="preview-footer">
          <span className="signal-dot" />
          <span>Explore → replay → minimize → reproduce</span>
        </div>
      </div>
    </section>
  );
}
