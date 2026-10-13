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
        title="Try a demo API"
        description="Choose a bundled API to see the complete testing pipeline. GhostQA starts the local target and explores workflows. To upload your own specification, use Import OpenAPI in the navigation."
      />
      <div className="px-6 py-5">
        <FixturePicker fixtures={fixtures} />
      </div>
    </>
  );
}
