import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import type { Database } from './db/client'
import type { Env } from './env'
import type { AppEnv } from './http/context'
import { buildApiError, handleError } from './http/errors'
import { requireApiKey } from './middleware/api-key'
import { registerContentRoutes } from './routes/content'
import { registerHealthRoutes } from './routes/health'
import { registerSchemaRoutes } from './routes/schema'

/**
 * Assembles the HTTP surface.
 *
 * Kept separate from `index.ts` so tests can build an app against a throwaway
 * database without binding a port.
 */
export function createApp(env: Env, db: Database): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>()

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
        c.get('requestId'),
      ),
      404,
    ),
  )

  // Scopes are mounted per path prefix, so a read key that leaks from a
  // customer's deployment cannot be used to rewrite their content schema.
  app.use('/v1/content/*', requireApiKey(db, 'content:read'))
  // Reading the schema is what `ainam pull` does to generate types, so the
  // site's own read key is enough. Rewriting it is not.
  app.on('GET', '/v1/schema/*', requireApiKey(db, 'content:read'))
  app.on('POST', '/v1/schema/*', requireApiKey(db, 'schema:write'))

  registerHealthRoutes(app, db)
  registerContentRoutes(app, db)
  registerSchemaRoutes(app, db)

  app.openAPIRegistry.registerComponent('securitySchemes', 'apiKey', {
    type: 'http',
    scheme: 'bearer',
    description: 'A project API key, created in the dashboard.',
  })

  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'AINAM CMS server', version: '0.0.0' },
  })

  return app
}
