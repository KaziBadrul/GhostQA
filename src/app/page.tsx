import { McpHero } from '@/components/mcp-hero';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing">
      <McpHero />
      <section className="setup-page" id="how-it-works">
        <h2>Built for your backend</h2>
        <p>
          The generated Node server exposes only the endpoints you select. Your
          backend launches it through the official MCP SDK. The README covers
          inputs, authentication, important notes and error recovery.
        </p>
        <p>
          The workflow testing engine is also available.{' '}
          <Link href="/runs/new">Run a fuzzing demo</Link> or{' '}
          <Link href="/recorded">inspect recorded evidence</Link>.
        </p>
      </section>
      <footer className="landing-footer">
        <span>GhostQA</span>
        <span>Your contract. Your tools.</span>
      </footer>
    </main>
  );
}
