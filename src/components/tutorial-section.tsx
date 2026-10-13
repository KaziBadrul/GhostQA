import Link from 'next/link';
export function TutorialSection() {
  return (
    <section className="landing-start">
      <div>
        <h2>
          Start with a contract.
          <br />
          See what happens between the calls.
        </h2>
        <p>
          Have an API specification? Import it and inspect your endpoints. Want
          to see the full testing pipeline first? Start with a bundled demo.
        </p>
      </div>
      <div className="landing-actions">
        <Link href="/projects/new" className="landing-primary">
          Import your API <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/recorded" className="landing-secondary">
          Explore recorded runs
        </Link>
      </div>
    </section>
  );
}
