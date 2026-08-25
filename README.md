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
  starter-next/  Reference template — a site whose copy is edited in AINAM.
```

## Getting started

The whole stack, with nothing installed but Docker:

```bash
docker compose up
```

That brings up Postgres, applies migrations, and serves the API on
http://localhost:8787, the dashboard on http://localhost:3000 and the reference
template on http://localhost:3200 — a real page rendering real content, before
you have configured anything. No accounts,
no external services. `./scripts/smoke.sh` asserts exactly this, and CI runs it
on every push.

To work on the code you also need Node 24 (see `.nvmrc`) and pnpm, which
`corepack enable` provides at the version this repository pins:

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm build
```

`.env.example` documents every variable the workspace reads. The
`BETTER_AUTH_SECRET` it ships is a development placeholder — it is published in
this repository, so cms-server refuses to start with it when `NODE_ENV` is
`production`.

## Creating the first project

A fresh install has an empty database and no way in — the content API needs a
key, and a key needs a project. Bootstrap creates both:

```bash
docker compose exec cms-server node dist/bootstrap.mjs \
  --org "Acme" --project "Acme web" --slug acme-web --locale en
```

It prints an `AINAM_PROJECT_ID` and an `AINAM_API_KEY` once — only the key's
hash is stored, so there is no way to show it again. It refuses to run a second
time; further projects belong in the dashboard, not in an unauthenticated path.

The bootstrap key carries `schema:write`. Keep it with the developer and issue a
`content:read` key for the deployed site.

## Connecting a website

The content schema lives in the website's codebase, not in a dashboard form.

```bash
npx ainam init     # writes ainam.config.ts and the env keys it needs
npx ainam push     # uploads the schema
npx ainam pull     # generates types and a content snapshot per locale
```

`pull` writes `ainam.gen.ts`. Pass it to the client and a wrong content key
stops being a blank section on the page and becomes a compile error:

```ts
import type { AinamContent } from './ainam.gen'

const ainam = createAinamClient<AinamContent>({ /* … */ })

const title = await ainam.get('home/hero/title')  // string
await ainam.get('home/hero/titel')                // error, and it lists the real keys
```

It also writes `ainam-snapshot.<locale>.json`. Pass that as `snapshot` and the
site keeps rendering when AINAM is unreachable.

Keys declared in `ainam.config.ts` carry a `default`, and `push` seeds it into
both the draft and the published copy — so the site renders the copy the
developer already wrote, from its first deploy, instead of a blank page waiting
for someone to fill it in. A later push never overwrites what the customer has
since edited, and a key removed from the schema stops being editable but keeps
its content.

Keys are scoped. The key in a customer's deployment is `content:read` only, so
if it leaks it cannot rewrite their schema; `push` needs a `schema:write` key
the developer keeps.

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

`cms-server` applies pending migrations at startup, which is what makes
`docker compose up` a single step. Set `RUN_MIGRATIONS_ON_START=false` where a
deploy pipeline runs them as its own stage instead.

## Licence

The applications under `apps/` are AGPL-3.0. The packages under `packages/` that
are published to npm are MIT, so building on the SDK carries no copyleft
obligation. Each directory carries its own `LICENSE`.
