#!/usr/bin/env node
/**
 * `pnpm --filter @ainam/cms-server bootstrap`, or in a container:
 * `docker compose exec cms-server node dist/bootstrap.mjs`
 *
 * Prints the API key to stdout exactly once, because only its hash is stored.
 */
import { createDatabase } from './db/client'
import { loadEnv } from './env'
import { bootstrapWorkspace } from './services/bootstrap'

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback)
}

const env = loadEnv()
const db = createDatabase(env.DATABASE_URL)

try {
  const result = await bootstrapWorkspace(db, {
    organizationName: option('org', 'My organisation'),
    projectName: option('project', 'My site'),
    projectSlug: option('slug', 'my-site'),
    defaultLocale: option('locale', 'en'),
  })

  process.stdout.write(`Project created.

  AINAM_PROJECT_ID=${result.projectId}
  AINAM_API_KEY=${result.apiKey}

Copy these into your website's .env now — the key is not stored in a form we
can show again. It carries content:read and schema:write, so keep it out of
anything you deploy and issue a read-only key for the site itself.
`)
  process.exit(0)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
