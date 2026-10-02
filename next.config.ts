import type { NextConfig } from 'next';

// The submission track invokes the existing engine orchestration
// (`src/cli/vertical-slice`) the same way the CLI and benchmark harness do. That
// module statically reaches `src/engine/exports/bundle`, which imports esbuild
// and resolves a repository-root URL; it is a build-time-only path that must
// never enter an application bundle. esbuild therefore stays external.
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['esbuild'],
};
export default config;