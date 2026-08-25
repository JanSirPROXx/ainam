import path from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  // Next writes its own AGENTS.md and CLAUDE.md into the app directory on dev.
  // This repository already has a CLAUDE.md that says something different, and
  // a second one three levels down is worse than none.
  agentRules: false,
  // Standalone bundles only the traced dependencies, which keeps the container
  // small and means the runtime stage needs no package manager at all.
  output: 'standalone',
  // Without this the tracer roots at the app directory and misses the workspace
  // packages hoisted to the repository root.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // The dashboard talks to cms-server over HTTP only — it must never gain a
  // direct database dependency, so there is nothing to transpile from the
  // server workspace here.
}

export default config
