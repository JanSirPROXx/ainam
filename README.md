# AINAM

An AI-native CMS layer. A developer — or an AI agent — builds a website, installs
the `ainam` package, and pulls content from the CMS server. The site owner then
edits that content through the AINAM dashboard, without going back to a developer
for every small change.

Self-hosting is a first-class deployment mode, not a degraded one. No code path
assumes AINAM Cloud.

## Repository

```
apps/
  cms-server/    Content API + admin API. Owns the database.      AGPL-3.0
  dashboard/     Editor UI. A pure client of the admin API.       AGPL-3.0
packages/
  schema/        Zod schemas and shared types.                    internal
  core/          @ainam/core  — framework-agnostic client.        MIT
  next/          @ainam/next  — App Router adapter.               MIT
  cli/           ainam        — project tooling.                  MIT
examples/
  starter-next/  Reference template.
```

## Getting started

Requires Node 22 (see `.nvmrc`) and pnpm 11.

```bash
pnpm install
cp .env.example .env
pnpm build
```

`.env.example` documents every variable the workspace reads.

## Commands

```bash
pnpm dev          # every app in watch mode
pnpm build        # build all workspaces in dependency order
pnpm typecheck    # tsc --noEmit everywhere
pnpm lint         # oxlint
pnpm test         # vitest
pnpm db:generate  # generate a migration from the Drizzle schema
pnpm db:migrate   # apply pending migrations
```

A Postgres instance is needed to run `cms-server`. Docker Compose support is not
wired up yet.

## Licence

The applications under `apps/` are AGPL-3.0. The packages under `packages/` that
are published to npm are MIT, so building on the SDK carries no copyleft
obligation. Each directory carries its own `LICENSE`.
