export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { PageHeader } from '@/components/shell';
import { Dashboard } from '@/components/dashboard';
import { demoRunList } from '@/server/demo/runtime';
import { demoFixtures } from '@/server/demo/catalog';
import { recordedRuns } from '@/server/demo/recorded';
import { DEMO_LIMITS } from '@/lib/demo-view';

export default async function Home() {
  const [list, fixtures, recorded] = await Promise.all([
    demoRunList(),
    demoFixtures(),
    recordedRuns(),
  ]);
  return (
    <>
      <PageHeader
        title="GhostQA"
        description="Autonomous API regression testing. GhostQA proposes unusual but individually valid API workflows, executes them inside a frozen scope, observes approved invariants, independently reproduces any violation from a fresh state, and minimizes the sequence."
      />
      <Dashboard
        runs={list.runs}
        activeRunId={list.activeRunId}
        fixtures={fixtures}
        recordedCount={recorded.length}
        recordedConfirmed={recorded.filter(
          (summary) =>
            summary.discoveryStatus === 'OBSERVED VIOLATION' &&
            summary.confirmationStatus === 'CONFIRMED',
        ).length}
        limits={DEMO_LIMITS}
      />
    </>
  );
}