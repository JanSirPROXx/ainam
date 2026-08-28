# ainam

Command line interface for AINAM projects.

```bash
npx ainam init
```

`init` creates `ainam.config.ts` — where the content schema is declared — and
adds the required keys to `.env.example`. It never overwrites an existing
config.

`push` uploads the schema; newly added keys are seeded with their declared defaults, and a
later push never overwrites what the customer has since edited. `pull` writes `ainam.gen.ts`
and one `ainam-snapshot.<locale>.json` per locale. `generate` writes the types alone, without
contacting a server — useful in a build that has no credentials.

All three read `AINAM_URL`, `AINAM_API_KEY` and `AINAM_PROJECT_ID` from the environment. There
is no default server: the value decides where your schema and key are sent.

## Licence

MIT
