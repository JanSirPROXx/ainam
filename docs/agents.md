# Adding AINAM to a website — instructions for an AI agent

You were asked to add AINAM to a website. This page is everything you need. Follow it in order, do
the work yourself, and ask the person one question only: their email address.

AINAM makes the text, images and sections of a site editable in a dashboard, so the owner does not
need a developer for every change. The content is declared in the site's code. The dashboard edits
it, and publishing updates the live site.

## Before you start

**Check the site.** AINAM supports Next.js on the App Router (Next 16, React 19). If the site is
something else, stop and say so. Do not improvise an adapter.

**Pick the server.** Use `https://cms.91.99.238.68.sslip.io` unless the person names another one. It
is a preview server: free for now, without guarantees. Everything below works the same against a
server the person runs themselves.

```bash
AINAM_URL=https://cms.91.99.238.68.sslip.io
AINAM_DASHBOARD=https://dashboard.91.99.238.68.sslip.io
```

The first is the server your code talks to. The second is where the person signs in and edits.
For another server, ask for both addresses.

**Ask for their email address,** which becomes the login for the dashboard. Then say in one
sentence what you are about to create: an account, one project and two API keys on that server. You
were asked to do this, so do not wait for a second confirmation.

## 1. Install

```bash
npm install @ainam/core @ainam/next
npm install --save-dev @ainam/cli
```

The CLI package is `@ainam/cli`. The command it installs is `ainam`.

## 2. Account, project and keys

No browser is needed. Use a cookie jar and plain HTTP.

Create the account with a password you generate. Keep it in memory: you will show it to the person
once at the end and never write it into a file.

```bash
PASSWORD=$(openssl rand -base64 18)
curl -s -c jar.txt -X POST "$AINAM_URL/api/auth/sign-up/email" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$EMAIL\"}"
```

If the answer says the user already exists, the person has an account. Do not create another and do
not guess a password. Ask them for it once, then sign in instead:
`POST $AINAM_URL/api/auth/sign-in/email` with the same body shape and `-c jar.txt`.

Create the project. It gets an organisation of its own, and the person is its owner.

```bash
curl -s -b jar.txt -X POST "$AINAM_URL/admin/projects" \
  -H 'content-type: application/json' -d '{"name":"My site"}'
```

Use the site's own name instead of `My site`.

The answer holds the project `id`. Then create two keys. Each answer shows its `key` exactly once.

```bash
# to upload the content schema. Use it for one command, then discard it.
curl -s -b jar.txt -X POST "$AINAM_URL/admin/projects/$PROJECT_ID/api-keys" \
  -H 'content-type: application/json' \
  -d '{"name":"agent (push)","scopes":["schema:write","content:read"]}'

# for the site itself. Read only.
curl -s -b jar.txt -X POST "$AINAM_URL/admin/projects/$PROJECT_ID/api-keys" \
  -H 'content-type: application/json' -d '{"name":"site","scopes":["content:read"]}'
```

Write only these three lines to the site's `.env`, and make sure `.env` is in `.gitignore`. The
read-only key goes here. The push key does not.

```bash
AINAM_URL=...
AINAM_PROJECT_ID=...
AINAM_API_KEY=<the read-only key>
```

## 3. Declare the content

Read the site and find every piece of text, image and section a person might want to change. Write
them into `ainam.config.ts` with `defineContentSchema` from `@ainam/core`. Run `npx ainam init` if
you want the scaffold, and read `examples/starter-next/ainam.config.ts` for the shape of every
field type.

- Keys are lowercase and slash-separated, like `home/hero/title`. Never `home/heroTitle`.
- Every key needs a `default`. Use the text that is on the site today, word for word, so the site
  looks the same the moment it is connected.
- Use a boolean for a section that should be switchable, a `list` for repeated rows, `richText` for
  a body with formatting, and `image` for pictures.

## 4. Upload and generate types

Pass the push key in the environment of this one command. It wins over the `.env`, and nothing
stores it.

```bash
AINAM_API_KEY=<the push key> npx ainam push
npx ainam pull
```

`pull` writes `ainam.gen.ts`, the typed content map, and one snapshot file per locale. A wrong key
is now a compile error.

## 5. Wire the site

Copy the shape from the starter, which is the whole integration:

- `src/lib/ainam.ts` creates the client once:
  https://raw.githubusercontent.com/JanSirPROXx/ainam/main/examples/starter-next/src/lib/ainam.ts
- `src/app/api/ainam/revalidate/route.ts` refreshes the site after a publish:
  https://raw.githubusercontent.com/JanSirPROXx/ainam/main/examples/starter-next/src/app/api/ainam/revalidate/route.ts

Then replace each hardcoded string with `await ainam.get('home/hero/title')`. Render an image with
`ainamImageProps` and rich text with `AinamRichText` from `@ainam/next`. Run the type check and the
build. A key that does not exist fails here, which is the point.

## 6. The webhook

A publish only reaches the live page if the server can call the site. If the site is already
deployed at a public address, set it and give the site the secret:

```bash
curl -s -b jar.txt -X PATCH "$AINAM_URL/admin/projects/$PROJECT_ID" \
  -H 'content-type: application/json' \
  -d '{"webhookUrl":"https://<the site>/api/ainam/revalidate"}'
curl -s -b jar.txt -X POST "$AINAM_URL/admin/projects/$PROJECT_ID/webhook-secret"
```

The second answer holds `webhookSecret`, shown once. It belongs in the site's environment as
`AINAM_WEBHOOK_SECRET`. If the site is not deployed yet, skip this step and tell the person it is
the one thing left to do after the first deploy.

## When you are done

Tell the person, in plain words:

- what you created: the account, the project, the keys, the files you changed;
- the dashboard address (`$AINAM_DASHBOARD`) with their email and the generated password, **once**.
  Tell them to keep it in a password manager: the preview server does not send email, so a
  forgotten password cannot be reset by mail;
- that the site's deployment needs `AINAM_URL`, `AINAM_PROJECT_ID` and `AINAM_API_KEY` set, and the
  webhook secret if you set the webhook;
- that the push key was used once and not stored. A new one is created under Settings in the
  dashboard when the schema changes.

Delete `jar.txt`: it holds a session. Never commit a key, a password or a secret, and never print
one into a log you leave behind.
