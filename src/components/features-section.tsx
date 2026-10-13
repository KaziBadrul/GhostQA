export function FeaturesSection() {
  return (
    <section className="landing-process" id="how-it-works">
      <div className="process-heading">
        <h2>
          From API contract
          <br />
          to a reproducible failure.
        </h2>
        <p>
          Each finding has a trail you can inspect. A model proposes the
          workflow; the engine controls execution and verification.
        </p>
      </div>
      <ol className="process-list">
        <li>
          <span>01</span>
          <div>
            <h3>Bring your API</h3>
            <p>
              Upload or paste an OpenAPI document. Review supported operations
              and any exclusions before configuring a test.
            </p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <h3>Explore the unexpected</h3>
            <p>
              GhostQA proposes sequences of valid actions and executes within an
              approved target scope and finite budget.
            </p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <h3>Get evidence you can use</h3>
            <p>
              Violations are replayed from fresh state. Confirmed failures get a
              minimized reproduction, a report, and a regression artifact.
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}
