import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import type { Database } from './db/client'
import type { Env } from './env'
import { registerHealthRoutes } from './routes/health'

/**
 * Assembles the HTTP surface.
 *
 * Kept separate from `index.ts` so tests can build an app against a throwaway
 * database without binding a port.
 */
export function createApp(env: Env, db: Database): OpenAPIHono {
  const app = new OpenAPIHono()

  // Only the admin API is browser-facing. The content API is called server-side
  // with an API key, so a permissive CORS policy there would buy nothing.
  app.use('/admin/*', cors({ origin: env.DASHBOARD_ORIGIN, credentials: true }))

  registerHealthRoutes(app, db)

  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'AINAM CMS server', version: '0.0.0' },
  })

  return app
}
