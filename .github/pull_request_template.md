## What changes, and why

<!-- The mechanism, then the consequence. If this fixes something, say what the
     failure looked like from outside. -->

## Checks

- [ ] `pnpm build && pnpm typecheck && pnpm lint && pnpm test` pass
- [ ] A changeset is included, or this touches nothing under `packages/*`
- [ ] `./scripts/smoke.sh` passes, or this touches nothing in the server, the schema or Compose
- [ ] Any claim added to a README is checkable against a line in the repository
