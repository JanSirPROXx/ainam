# Contributing

## Getting the stack running

```bash
cp .env.example .env
docker compose up
```

That is the whole setup. If it does not work from a clean checkout, that is a
bug worth reporting on its own — self-hosting is a first-class deployment mode
here, not a degraded one.

## Before you open a pull request

```bash
pnpm install
pnpm build       # before typecheck: workspaces resolve each other through dist
pnpm typecheck
pnpm lint
pnpm test
```

**Build before typecheck.** The workspace packages resolve each other through
their built output, so a typecheck against a stale or missing `dist` either
fails for the wrong reason or passes for one. Deleting every `dist` and running
the sequence above is the way to reproduce what CI does.

The smoke suite (`./scripts/smoke.sh`) drives the whole stack in containers and
takes a few minutes. CI runs it on every push; run it locally when you have
touched the server, the schema or Compose.

## Changesets

Any change touching `packages/*` needs one:

```bash
pnpm changeset
```

Describe the change the way a consumer would read it in a changelog, and commit
the file it writes alongside the code. Changes under `apps/` and `examples/` do
not need one — those are deployed, not published.

## What the checks are protecting

Each of these exists because something got through once:

- `pnpm lint` also fails on a raw hex colour or a non-token font family, and on
  a workspace that has no test script — `pnpm -r run test` skips those silently,
  which is how the dashboard went three milestones with no tests at all.
- `scripts/check-sdk-budget.mjs` fails if `@ainam/core` gains a runtime
  dependency or its declaration file grows past its budget. Deriving public
  types from Zod inferences once produced a 100 kB `.d.ts` for a 5 kB client.
- The smoke suite runs the storage bootstrap twice, because it always starts
  from a wiped volume and so could not otherwise catch a second `docker compose
  up` failing.

## Conventions

One concern per pull request. Conventional Commits. Comments explain *why*, not
*what* — `CLAUDE.md` has the full set, and it is worth reading before a first
change.
