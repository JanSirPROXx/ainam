import { serve } from '@hono/node-server'
import { createApp } from './app'
import { createAuth } from './auth'
import { createDatabase } from './db/client'
import { runMigrations } from './db/migrate'
import { loadEnv } from './env'
import { createMailer } from './mail'
import { createStorage } from './storage'

const env = loadEnv()
const db = createDatabase(env.DATABASE_URL)

if (env.RUN_MIGRATIONS_ON_START) {
  await runMigrations(db, new URL('../drizzle', import.meta.url).pathname)
  process.stdout.write('migrations up to date\n')
}

const mailer = createMailer(env)
if (mailer.name === 'console') {
  process.stdout.write(
    'mail transport: console — invitations and password resets are printed here, not sent\n',
  )
}

const storage = createStorage(env)
process.stdout.write(
  storage === undefined
    ? 'object storage: not configured — image uploads are refused\n'
    : storage.servesBytes
      ? 'object storage: bytes stream through this server — set STORAGE_PUBLIC_URL in production\n'
      : `object storage: images served from ${env.STORAGE_PUBLIC_URL}\n`,
)

const auth = createAuth(env, db, mailer, storage)
const app = createApp(env, db, auth, storage)

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  process.stdout.write(`cms-server listening on http://localhost:${info.port}\n`)
})
