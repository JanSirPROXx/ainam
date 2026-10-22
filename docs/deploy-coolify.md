# Deploy AINAM with Coolify

This puts the dashboard and cms-server on a server you run [Coolify](https://coolify.io) on, and
redeploys them from GitHub whenever `main` passes CI.

The stack is [`docker-compose.coolify.yml`](../docker-compose.coolify.yml): Postgres, Garage for
uploaded images, cms-server and the dashboard. The images are built by the
[Deploy workflow](../.github/workflows/deploy.yml) and pulled by the server. Nothing is built
on the server, which is why a 4 GB host with other things on it can run this.

Expect about 350 MB of memory at rest. cms-server uses more while it processes an upload.

## Before you start

- Coolify, with **API access** switched on under Settings, Advanced. The deploy webhook needs it.
- Two addresses that point at the server and share a parent domain, such as
  `cms.example.com` and `dashboard.example.com`. With no domain, use
  `cms.<server-ip>.sslip.io` and `dashboard.<server-ip>.sslip.io`: they resolve to the IP with no
  DNS record, and Coolify's proxy gets a real certificate for them.
- `gh` signed in to the repository, for step 5.

The two addresses have to share a parent domain. The dashboard signs in against cms-server with a
cookie, and a browser withholds that cookie between unrelated sites. Two different domains sign in
and are signed out again on the next request. There is no fallback for that yet.

## 1. Publish the images

Run the **Deploy** workflow once from the Actions tab, on `main`. It publishes three images to
`ghcr.io/jansirproxx/`: `ainam-cms-server`, `ainam-dashboard` and `ainam-garage-init`, each as
`latest` and as `sha-<commit>`.

If a later pull fails with `denied`, the package is private. Open each of the three under the
repository's Packages, then Package settings, and change the visibility to public. The images hold
no secrets: every secret is set on the server.

## 2. Create the resource

In Coolify: your project, New resource, Public repository.

| Field | Value |
|---|---|
| Repository | `https://github.com/JanSirPROXx/ainam` |
| Branch | `main` |
| Build pack | Docker Compose |
| Base directory | `/` |
| Docker Compose location | `/docker-compose.coolify.yml` |

Leave automatic deploys off. The workflow decides when to deploy, after CI, and a second trigger
would deploy a commit before its images exist.

## 3. Set three values

Generate them on your own machine:

```bash
echo "GARAGE_RPC_SECRET=$(openssl rand -hex 32)"
echo "STORAGE_ACCESS_KEY_ID=GK$(openssl rand -hex 12)"
echo "STORAGE_SECRET_ACCESS_KEY=$(openssl rand -hex 32)"
```

Paste the three lines under Environment variables, in the Developer view. The deploy refuses to
start until all three are set. Coolify generates the database password, the sign-in secret and the
storage admin token itself.

Optional variables, all with a default:

| Variable | Default | What it does |
|---|---|---|
| `SIGNUP_MODE` | `open` | `invite-only` stops strangers creating accounts. The first account on an empty instance is always allowed. |
| `MAIL_TRANSPORT` | `console` | Prints invitation and reset links to the cms-server log. Set `smtp` and `SMTP_URL` to send them. |
| `AINAM_VERSION` | `latest` | The image tag. Set `sha-<commit>` to pin a version or roll back. |
| `STORAGE_PUBLIC_URL` | empty | Empty streams images through cms-server. Set it once Garage's web port has a public HTTPS address. |

`SIGNUP_MODE=open` lets anyone who finds the dashboard create an account, a project of their own
and upload images to it, with no storage limit. Switch it to `invite-only` before you share the
address.

## 4. Set the two addresses

Under Domains, give the two services an address each. The port is part of the address in this
field, and it is the container's port, not a public one.

| Service | Domain |
|---|---|
| `cms-server` | `https://cms.example.com:8787` |
| `dashboard` | `https://dashboard.example.com:3000` |

Leave the other three without a domain. They are not reachable from outside, and should not be.

## 5. Connect GitHub

In Coolify, open the resource's Webhooks section and copy the **Deploy Webhook** URL. Under Keys and
Tokens, create an API token with the **Deploy** permission. Then:

```bash
gh secret set COOLIFY_WEBHOOK --repo JanSirPROXx/ainam
gh secret set COOLIFY_TOKEN --repo JanSirPROXx/ainam
```

`gh` asks for each value. Until both are set, the workflow still publishes images and says what is
missing as a warning, without failing.

## 6. Deploy, and sign in

Press Deploy in Coolify, or run the Deploy workflow again. The first start takes a few minutes:
Garage assigns its layout, cms-server applies the migrations, and the proxy requests the
certificates.

Open the dashboard address, choose Create an account, then New project. A new project has no key
yet. Under Settings, create a `schema:write` key for whoever runs `ainam push`, and a
`content:read` key for the website.

## From then on

A merge to `main` runs CI, publishes the images and redeploys. Nothing else is needed.

**Roll back.** Set `AINAM_VERSION` to the `sha-<commit>` of the last good deploy, then Deploy. The
tag is in the workflow run that built it.

**Logs.** In Coolify, per service. With `MAIL_TRANSPORT=console`, invitation and password reset
links are in the cms-server log.

**Backups are not set up.** Coolify's scheduled backups cover databases it manages as resources of
their own, and the Postgres in this stack is not one of them. Until you add a backup, a lost volume
is lost data. A dump, run on the server:

```bash
docker ps --filter name=postgres --format '{{.Names}}'
docker exec <that container> pg_dump -U <user> ainam > ainam.sql
```

The first command lists the Postgres containers by name. Pick the one that belongs to this
resource: the server may run others. `<user>` is the value of `SERVICE_USER_POSTGRES` in the
resource's environment variables.

## When something is wrong

**The dashboard loads and every request fails.** Open the browser's network tab. If the requests go
to `localhost:8787`, `CMS_PUBLIC_URL` did not reach the container. It is filled from the `cms-server`
domain in step 4, so check that domain is set and that you redeployed after setting it.

**You sign in and are signed out on the next click.** The two addresses do not share a parent
domain, or one of them is `http`. Both must be `https` subdomains of one domain.

**The deploy stops with "required variable is missing".** One of the three values in step 3 is empty.

**`denied` when pulling an image.** See step 1: the package is private.

**The certificate is not issued for an sslip.io address.** Let's Encrypt limits how many
certificates it issues for a shared domain per week, and sslip.io is shared by everyone who uses it.
Wait, or use a domain of your own.
