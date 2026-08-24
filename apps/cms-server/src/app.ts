import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import type { Database } from './db/client'
import type { Env } from './env'
import { buildApiError, handleError } from './http/errors'
import { registerHealthRoutes } from './routes/health'

/**
 * Assembles the HTTP surface.
 *
 * Kept separate from `index.ts` so tests can build an app against a throwaway
 * database without binding a port.
 */
export function createApp(env: Env, db: Database): OpenAPIHono {
  const app = new OpenAPIHono()

  // First, so every later handler and every log line can quote the same id.
  app.use('*', requestId())

  // Only the admin API is browser-facing. The content API is called server-side
  // with an API key, so a permissive CORS policy there would buy nothing.
  app.use('/admin/*', cors({ origin: env.DASHBOARD_ORIGIN, credentials: true }))

  app.onError(handleError)
  app.notFound((c) =>
    c.json(
      buildApiError(
        'not_found',
        `No route for ${c.req.method} ${new URL(c.req.url).pathname}. See /openapi.json for what exists.`,
        c.get('requestId') ?? 'unknown',
      ),
      404,
    ),
  )

  registerHealthRoutes(app, db)

  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'AINAM CMS server', version: '0.0.0' },
  })

  return app
}
