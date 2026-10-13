import Link from 'next/link';
export function McpHero() {
  return (
    <section className="landing-hero">
      <div className="hero-wash" aria-hidden="true" />
      <div className="hero-copy">
        <p className="label">OpenAPI → MCP</p>
        <h1>
          Your API.
          <br />
          <span>Ready for your app’s tools.</span>
        </h1>
        <p>
          Upload your OpenAPI contract and notes. Choose endpoints, download a
          local MCP server, and connect it to your application’s backend.
        </p>
        <div className="landing-actions">
          <Link className="landing-primary" href="/mcp">
            Generate MCP server <span aria-hidden="true">↗</span>
          </Link>
          <Link className="landing-secondary" href="/projects">
            Saved projects
          </Link>
        </div>
        <p className="hero-note">
          OpenAPI 3.0 / 3.1 · JSON or YAML · Node stdio
          <br />
          Credentials stay in your server’s environment.
        </p>
      </div>
      <div
        className="workflow-preview"
        aria-label="OpenAPI to MCP conversion steps"
      >
        <div className="preview-header">
          <span>Your conversion</span>
          <span className="preview-tag">Local server</span>
        </div>
        <div className="preview-intro">
          A contract becomes a bounded set of tools.
        </div>
        <ol className="workflow-steps">
          <li>
            <span className="step-node">1</span>
            <div>
              <strong>Import your contract</strong>
              <small>JSON or YAML, plus your API notes</small>
            </div>
          </li>
          <li>
            <span className="step-node">2</span>
            <div>
              <strong>Select endpoints</strong>
              <small>Validated inputs and explicit mutation selection</small>
            </div>
          </li>
          <li>
            <span className="step-node">3</span>
            <div>
              <strong>Review and download</strong>
              <small>Server, manifest, documentation and client</small>
            </div>
          </li>
          <li>
            <span className="step-node">4</span>
            <div>
              <strong>Connect your backend</strong>
              <small>Launch locally over stdio and call tools</small>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
