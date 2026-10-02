export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { PageHeader } from '@/components/shell';
import { FixturePicker } from '@/components/fixture-picker';
import { demoFixtures } from '@/server/demo/catalog';

export default async function NewRunPage() {
  const fixtures = await demoFixtures();
  return (
    <>
      <PageHeader
        title="New test run"
        description="Choose a local API fixture. GhostQA starts the fixture, freezes an approved scope, and lets the configured reasoning model propose workflows — nothing else is configurable from here, and nothing else is needed."
      />
      <div className="px-6 py-5">
        <FixturePicker fixtures={fixtures} />
      </div>
    </>
  );
}