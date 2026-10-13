import Link from 'next/link';
import { ProjectSetup } from '@/components/project-setup';
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <div className="setup-page">
        <Link className="landing-primary" href={`/projects/${id}/mcp`}>
          Generate MCP server from this project
        </Link>
      </div>
      <ProjectSetup id={id} />
    </>
  );
}
