# Deploy the marketing site with Coolify

The marketing site in [`examples/marketing-next`](../examples/marketing-next) is our own site, in
English and German. It deploys as a Coolify resource of its own, next to the AINAM stack and
independent of it: a broken page never stops the CMS, and the other way round.

The image is built by the [Deploy workflow](../.github/workflows/deploy.yml) and pulled by the
server. Nothing is built on the host. The setup is the one in
[deploy-coolify.md](deploy-coolify.md), with a smaller compose file and fewer values.

## 1. The addresses are fixed when CI builds the image

The pages are prerendered, so the address of the dashboard they link to and the address the site
announces for itself are baked in at build time. Setting them on the running container would change
nothing. The workflow builds with these defaults:

| Repository variable | Default | What it sets |
|---|---|---|
| `MARKETING_DASHBOARD_URL` | `https://dashboard.91.99.238.68.sslip.io` | Where "Get started" and "Sign in" go |
| `MARKETING_SITE_URL` | `https://ainam.91.99.238.68.sslip.io` | The site's own address, for canonical and language links |

When the site has a domain, set both variables under Settings, Secrets and variables, Actions,
Variables, and run the Deploy workflow again. The defaults are fine for a preview.

## 2. Create the resource

In Coolify: your project, New resource, Public repository.

| Field | Value |
|---|---|
| Repository | `https://github.com/JanSirPROXx/ainam` |
| Branch | `main` |
| Build pack | Docker Compose |
| Base directory | `/` |
| Docker Compose location | `/docker-compose.marketing.yml` |

Check the **Build pack** field twice. Coolify offers Railpack first, and left there it builds the
repository on the server, which runs a small host out of memory. With the right setting the page lists
one service, `marketing`. Leave automatic deploys off.

## 3. Give it an address

Open the resource's Domains page and choose Add Domain. The dialog has separate fields:

| Field | Value |
|---|---|
| Service | `marketing` |
| Protocol | `https` |
| Domain | the host name only, with no `https://`, for example `ainam.91.99.238.68.sslip.io` |
| Port | `3300` |

Put the scheme in the Protocol field and not in Domain: written into Domain it ends up doubled and
the dialog refuses it. Save, delete the address Coolify generated on its own, and open the page
again to check that the one you entered is still there.

The host name has to match `MARKETING_SITE_URL` from step 1, or the language links point somewhere
else.

## 4. Deploy

Press Deploy. The first start takes a minute: Coolify pulls the image and the proxy requests a
certificate. Open the address. `/` sends a visitor to `/en` or `/de` by the language their browser
asks for, and the switcher in the header changes it.

## 5. Let a merge deploy it

In Coolify, open the resource's Webhooks section and copy the **Deploy Webhook** URL, then:

```bash
gh secret set COOLIFY_MARKETING_WEBHOOK --repo JanSirPROXx/ainam
```

It uses the same `COOLIFY_TOKEN` as the stack. Until it is set, the workflow still publishes the
image and deploys everything else.

## Optional: read the copy from AINAM

As it is, the site renders from the English and German snapshots in the image, which is the same
path it takes when AINAM is unreachable. To edit it in the dashboard instead:

1. Create a project for it, and a key with `schema:write`. Push the schema in both languages:
   `ainam push --locales en,de --default-locale en`.
2. Publish the German copy, which a push cannot carry, from `examples/marketing-next`:
   `node scripts/publish-locale.mjs de`. It signs in as a person, because an API key cannot edit.
   See the header of the script for the variables.
3. In Coolify, set `AINAM_URL`, `AINAM_PROJECT_ID`, `AINAM_API_KEY` and `AINAM_WEBHOOK_SECRET` on the
   resource, point the project's webhook at `https://<the site>/api/ainam/revalidate`, and deploy.

The dashboard edits the default language today. German copy changes go through
`content/de.json` and the script until the dashboard can switch language.

## When something is wrong

**Every link points at `localhost`.** The image was built without the addresses. Run the Deploy
workflow again; the defaults in step 1 apply.

**The server stops answering during a deploy.** The Deployment Logs mention Railpack. The Build pack
is wrong, as in step 2.

**`denied` when pulling the image.** The package is private. Open `ainam-marketing` under the
repository's Packages and make it public.
