# starter-next

A Next.js site whose copy is edited in AINAM. Every string on the page comes
from the CMS — nothing is hardcoded, which is the point of the template.

## Run it

```bash
pnpm --filter @ainam/example-starter-next dev
```

It renders immediately, from the committed `ainam-snapshot.en.json`, and says so
with a badge. That is the same path a configured site takes when AINAM is
unreachable, so the fallback gets exercised by cloning the template rather than
only during an outage nobody tests for.

## Point it at a CMS

```bash
docker compose up                                  # from the repository root
docker compose exec cms-server node dist/bootstrap.mjs --slug starter
```

Put the printed values in `.env`, then:

```bash
pnpm ainam:push    # upload the schema in ainam.config.ts
pnpm ainam:pull    # regenerate ainam.gen.ts and the snapshot
```

The badge switches to "Live content". Edit a value in the database or the
dashboard, publish, and the page follows without a redeploy — provided the
project's webhook points at `/api/ainam/revalidate`.

## What to copy from here

`src/lib/ainam.ts` is the whole integration: one accessor, created once, with
the snapshot passed in. `ainam.config.ts` is the schema, and it lives here
rather than in a dashboard so a wrong key is a compile error.
