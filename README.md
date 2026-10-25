# AINAM

An AI-native CMS layer. A developer — or an AI agent — builds a website, installs
the AINAM packages, and pulls content from the CMS server. The site owner then
edits that content through the AINAM dashboard, without going back to a developer
for every small change.

**Let your AI agent do it.** Paste this into Claude Code, Cursor or any coding agent, in the
project of a Next.js site:

```text
Add AINAM to this website, so its text, images and sections can be edited without a developer.
Follow https://raw.githubusercontent.com/JanSirPROXx/ainam/main/docs/agents.md.
Create the account, project and keys yourself, and ask me only for my email address.
```

The agent installs the packages, moves the site's copy into a content schema, creates the account on
the free preview server and uploads the schema. It tells you the dashboard login once, at the end.
You register nowhere and copy no keys. Running your own server? Name its address in the prompt. The
steps are in [docs/agents.md](docs/agents.md).

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
  cli/           @ainam/cli   — project tooling.                  MIT
  ui/            Design system. Internal, never published.         MIT
examples/
  starter-next/  Reference template — a site whose copy is edited in AINAM.
  marketing-next/ Our own marketing site, running on AINAM.
```

## Try it

About ten minutes. You need Docker, and Node 24 with pnpm for step 3. Everything runs on your own
machine.

**1. Start the stack.**

```bash
git clone https://github.com/JanSirPROXx/ainam && cd ainam
docker compose up
```

The first start builds five images and takes a few minutes. When it settles, the dashboard is on
http://localhost:3000 and a reference site on http://localhost:3200.

**2. Create an account and a project.**

```bash
docker compose exec cms-server node dist/bootstrap.mjs --email you@example.com --slug try-site
```

It prints a project id, an API key, a webhook secret and, because the address had no account, a
password. Each is shown once.

**3. Upload the reference site's content schema.**

```bash
corepack enable && pnpm install
pnpm --filter "@ainam/cli..." build
cd examples/starter-next
```

Create `.env` there with the printed values:

```bash
AINAM_URL=http://localhost:8787
AINAM_PROJECT_ID=<the project id>
AINAM_API_KEY=<the API key>
```

```bash
node ../../packages/cli/dist/index.mjs push
```

That adds eight keys, each with the copy the site already shows. It runs the built file directly
because pnpm links the `ainam` command at install time, before the CLI exists in a fresh clone.

**4. Connect the site.** Add the project id, the key and the webhook secret to `.env` in the
repository root (`cp .env.example .env` if you have none), as `AINAM_PROJECT_ID`,
`AINAM_API_KEY` and `AINAM_WEBHOOK_SECRET`, then:

```bash
docker compose up -d
```

**5. Change something.** Sign in to the dashboard with the printed password and open the project.
Under Settings, set the webhook URL to `http://starter:3200/api/ainam/revalidate` — the site's
address inside the Compose network. Under Content, change the hero title, save it, and publish.
Reload http://localhost:3200: the page shows your text, and its badge reads "Live content".

Without the webhook a publish still reaches AINAM but never the page, which is the one thing to get
right. When you are done, `docker compose down -v` removes the stack and its data.

To put AINAM on a site of your own, see [Connecting a website](#connecting-a-website).

## Getting started

The whole stack, with nothing installed but Docker:

```bash
docker compose up
```

That brings up Postgres, applies migrations, and serves the API on
http://localhost:8787, the dashboard on http://localhost:3000, the reference
template on http://localhost:3200 and our own marketing site on
http://localhost:3300 — real pages rendering real content, before you have
configured anything. No accounts, no external services. `./scripts/smoke.sh`
asserts exactly this, and CI runs it on every push.

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
key, and a key needs a project. Bootstrap creates both, and the account that
owns them:

```bash
docker compose exec cms-server node dist/bootstrap.mjs \
  --email you@example.com --org "Acme" --project "Acme web" --slug acme-web --locale en
```

It prints an `AINAM_PROJECT_ID`, an `AINAM_API_KEY` and an
`AINAM_WEBHOOK_SECRET` once — only the key's hash is stored, so there is no way
to show it again.

`--email` makes that person the owner. If the address has no account yet,
bootstrap creates one with a generated password and prints it once; if it
already has one — you signed up in the dashboard first — the account is simply
attached. Leave `--email` out and the project exists but nobody can open it in
the dashboard, which bootstrap says in its output.

It refuses to run a second time, because every project after the first belongs
in the dashboard rather than behind an unauthenticated command. **New project**
creates the project together with an organisation of its own, with you as its
owner. It has no key yet: create one under Settings, a `schema:write` key for
the developer who runs `ainam push` and a `content:read` key for the site.

The bootstrap key carries `schema:write`. Keep it with the developer and issue a
`content:read` key for the deployed site. The webhook secret signs both publish
notifications and preview links, and an owner can replace it under Settings.

## Connecting a website

The content schema lives in the website's codebase, not in a dashboard form. For a Next.js
site on the App Router (Next 16, React 19):

```bash
npm install @ainam/core @ainam/next
npm install --save-dev @ainam/cli
npx ainam init     # writes ainam.config.ts and the env keys it needs
npx ainam push     # uploads the schema
npx ainam pull     # generates types and a content snapshot per locale
```

The package is `@ainam/cli`; the command it installs is `ainam`. All three read `AINAM_URL`, the
address of your cms-server, `AINAM_PROJECT_ID` and `AINAM_API_KEY` from the environment. There is
no default server on purpose: the value decides where your key is sent.

`examples/starter-next` is the whole integration in a handful of files — `ainam.config.ts` for the
schema, `src/lib/ainam.ts` for the client, and the two routes under `src/app/api/ainam/` that
refresh the site after a publish and open a preview.

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

## Publishing, rollback and preview

Every change is a draft until someone publishes it. A publish is one named
event: it carries an author, it lists the keys it changed, and it can be undone.

Undo comes in two shapes. **Restore** puts one key back to an earlier version.
**Revert** undoes a whole publish, by republishing what each of its keys said
beforehand. Both write the draft as well as the live value — without that, the
value you just rolled back would sit in the editor and return on your next
unrelated publish. Both are recorded as new publishes, so the rollback is itself
undoable.

Preview shows unpublished work on the real site. Point the project's preview URL
at a route that calls `createPreviewHandler`, and the Preview button opens a
signed, 15-minute link that turns Next's draft mode on:

```ts
// app/api/ainam/preview/route.ts
export const GET = createPreviewHandler({
  secret: process.env.AINAM_WEBHOOK_SECRET!,
  projectId: process.env.AINAM_PROJECT_ID!,
})
```

Reading drafts needs its own key, carrying `content:read:draft`, passed as
`previewApiKey`. That is deliberate: the key a site builds with lives in CI and
in every deploy environment, so it is the one most likely to leak, and
unpublished work must not be readable with it.

## Images and rich text

Uploads are re-encoded rather than passed through. The format is decided by
decoding the header — never the filename, never the declared type — and SVG is
refused, because it can carry script that would then run on your own site. What
lands in the bucket is one EXIF-stripped WebP, capped on the long edge, with the
original's dimensions recorded so a layout can reserve the space:

```tsx
const hero = await ainam.get('home/hero/image')
const props = ainamImageProps(hero)   // { src, width, height, alt } | null
return props ? <img {...props} /> : null
```

Content stores only the asset id and its alt text. The URL is spliced in per
response, so moving storage or putting a CDN in front of it changes nothing that
was written — and `ainam pull` inherits absolute URLs, so the build-time
snapshot still renders images with AINAM entirely down.

Rich text is stored as a node tree, never as HTML, and the set of nodes is fixed
in one place. The editor is configured from that list and both renderers map
over it, so formatting cannot exist that the site has no way to display:

```tsx
import { AinamRichText } from '@ainam/next'

const body = await ainam.get('home/about/body')
return <AinamRichText value={body} className="prose" />
```

`renderRichTextToHtml` returns a string for consumers who are not on React.
Both escape text and both drop a link whose scheme could run script.

## Inviting people

An organisation is one client site. An agency owner belongs to several and
switches between them in the topbar.

There are two roles. An **owner** edits and publishes, and manages settings,
keys and people. An **editor** edits and publishes, and nothing else — that
split is what lets an agency hand editing to its client without handing over the
login it uses for every other client.

Invitations and password resets go through `MAIL_TRANSPORT`. It defaults to
`console`, which prints the message to the server log instead of sending it, so
a fresh install works with no mail server and no account anywhere. The dashboard
also shows the invitation link directly, so an owner never has to read a log to
invite someone. Set `MAIL_TRANSPORT=smtp` and `SMTP_URL` for real delivery.

`SIGNUP_MODE` decides who may create an account. It defaults to `open`; set
`invite-only` on anything reachable from the internet, and only invited
addresses can register — apart from the first account on an empty instance,
which has nobody to invite it.

## Deploying

`docker compose up` is for trying AINAM on your own machine: it publishes Postgres and storage on
host ports, with credentials that are public in this repository. For a server, use
`docker-compose.coolify.yml` and follow [docs/deploy-coolify.md](docs/deploy-coolify.md). CI
publishes the images and redeploys on every merge to `main`.

## Commands

```bash
pnpm dev          # every app in watch mode
pnpm build        # build all workspaces in dependency order
pnpm typecheck    # tsc --noEmit everywhere
pnpm lint         # oxlint, design tokens, and that no workspace is silently untested
pnpm test         # vitest
pnpm db:generate  # generate a migration from the Drizzle schema
pnpm db:migrate   # apply pending migrations
```

`cms-server` applies pending migrations at startup, which is what makes
`docker compose up` a single step. Set `RUN_MIGRATIONS_ON_START=false` where a
deploy pipeline runs them as its own stage instead.

## Telemetry

AINAM collects nothing. No analytics, no crash reporting, no usage counters, no
phone-home on startup. There is no opt-out because there is nothing to opt out
of, and every claim below is checkable against a line in this repository.

What the dependencies do, and where each is turned off:

| Collector | Default | Where it is disabled |
|---|---|---|
| Next.js build and dev telemetry | on | `NEXT_TELEMETRY_DISABLED=1` in both Next `Dockerfile`s, in `docker-compose.yml`, and workflow-wide in `.github/workflows/ci.yml` |
| Better Auth | on | `telemetry: { enabled: false }` in `apps/cms-server/src/auth/index.ts` |
| drizzle-kit | none at the pinned version | nothing to disable — `drizzle-kit@0.31.10` contains no telemetry code |

Two things this does **not** cover, stated because a claim with a silent
exception is worse than no claim:

- **`@ainam/ui` loads Geist from Google Fonts.** Any page using the design system
  makes the visitor's browser fetch `fonts.googleapis.com`, which sends their IP
  and user agent to Google. This affects our dashboard. It does not affect a site
  built from `examples/starter-next`, which uses its own styles and no webfont.
  Self-hosting the files removes it; see the substitution note in
  `packages/ui/styles/tokens/fonts.css`.
- **The SDK talks to whichever server you configure.** `baseUrl` and `AINAM_URL`
  are required and have no default, precisely so that no code path can send your
  content or your API key somewhere you did not name.

## Licence

The applications under `apps/` are AGPL-3.0. The packages under `packages/` that
are published to npm are MIT, so building on the SDK carries no copyleft
obligation. Each directory carries its own `LICENSE`.
