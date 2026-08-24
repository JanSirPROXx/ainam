import { serve } from '@hono/node-server'
import { createApp } from './app'
import { createDatabase } from './db/client'
import { loadEnv } from './env'

const env = loadEnv()
const db = createDatabase(env.DATABASE_URL)
const app = createApp(env, db)

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  process.stdout.write(`cms-server listening on http://localhost:${info.port}\n`)
})
