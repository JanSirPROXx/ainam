#!/usr/bin/env node
/**
 * `pnpm --filter @ainam/cms-server bootstrap`, or in a container:
 * `docker compose exec cms-server node dist/bootstrap.mjs --email you@example.com`
 *
 * Prints the API key to stdout exactly once, because only its hash is stored.
 */
import { createAuth } from './auth'
import { createDatabase } from './db/client'
import { loadEnv } from './env'
import { createMailer } from './mail'
import { assertNoOrganization, bootstrapWorkspace } from './services/bootstrap'
import { type BootstrapOwner, resolveBootstrapOwner } from './services/bootstrap-owner'

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

function describeOwner(email: string, owner: BootstrapOwner): string {
  if (owner.password) {
    return `Account created. Sign in to the dashboard with:

  email:    ${email}
  password: ${owner.password}

The password is not stored in a form we can show again. If you lose it, use
"Forgot password" on the sign-in page; the default console mail transport prints
the reset link in the server log.
`
  }
  return `${email} already had an account, and now owns this project.\n`
}

const NO_OWNER_WARNING = `No owner was attached, so nobody can open this project in the dashboard.
Pass --email to make someone its owner. The key above still works for the CLI.
`

const env = loadEnv()
const db = createDatabase(env.DATABASE_URL)

try {
  const email = option('email')
  // Before the account is created, not after: a refused run must not leave a
  // user behind.
  await assertNoOrganization(db)
  const owner = email
    ? await resolveBootstrapOwner(db, createAuth(env, db, createMailer(env)), email)
    : undefined

  const result = await bootstrapWorkspace(db, {
    organizationName: option('org') ?? 'My organisation',
    projectName: option('project') ?? 'My site',
    projectSlug: option('slug') ?? 'my-site',
    defaultLocale: option('locale') ?? 'en',
    ownerUserId: owner?.userId,
  })

  process.stdout.write(`Project created.

  AINAM_PROJECT_ID=${result.projectId}
  AINAM_API_KEY=${result.apiKey}
  AINAM_WEBHOOK_SECRET=${result.webhookSecret}

Copy these into your website's .env now — the key is not stored in a form we
can show again. It carries content:read and schema:write, so keep it out of
anything you deploy and issue a read-only key for the site itself.

The webhook secret signs both publish notifications and preview links. Point
the project's webhook at your site to make a publish reach it without a deploy.

${email && owner ? describeOwner(email, owner) : NO_OWNER_WARNING}`)
  process.exit(0)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
