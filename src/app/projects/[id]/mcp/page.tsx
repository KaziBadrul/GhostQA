import { McpWizard } from '@/components/mcp-wizard';
export default async function ProjectMcpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <McpWizard projectId={id} />;
}
