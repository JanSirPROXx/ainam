import { serve } from '@hono/node-server'
import { createApp } from './app'
import { createAuth } from './auth'
import { createDatabase } from './db/client'
import { runMigrations } from './db/migrate'
import { loadEnv } from './env'

const env = loadEnv()
const db = createDatabase(env.DATABASE_URL)

if (env.RUN_MIGRATIONS_ON_START) {
  await runMigrations(db, new URL('../drizzle', import.meta.url).pathname)
  process.stdout.write('migrations up to date\n')
}

const auth = createAuth(env, db)
const app = createApp(env, db, auth)

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  process.stdout.write(`cms-server listening on http://localhost:${info.port}\n`)
})
