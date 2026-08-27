import { MAX_UPLOAD_BYTES, describeBytes } from '@ainam/schema'
import { OpenAPIHono } from '@hono/zod-openapi'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import type { Auth } from './auth'
import type { Database } from './db/client'
import type { Env } from './env'
import type { AppEnv } from './http/context'
import { buildApiError, handleError, refuseInvalidRequest } from './http/errors'
import { requireApiKey } from './middleware/api-key'
import { requireSession } from './middleware/session'
import { registerAdminApiKeyRoutes } from './routes/admin/api-keys'
import { registerAdminAssetRoutes } from './routes/admin/assets'
import { registerAdminEditorRoutes } from './routes/admin/editor'
import { registerAdminHistoryRoutes } from './routes/admin/history'
import { registerAdminProjectRoutes } from './routes/admin/projects'
import { registerAdminRollbackRoutes } from './routes/admin/rollback'
import { registerAssetRoutes } from './routes/assets'
import { registerContentRoutes } from './routes/content'
import { registerHealthRoutes } from './routes/health'
import { registerSchemaRoutes } from './routes/schema'
import type { Storage } from './storage'

/**
 * Assembles the HTTP surface.
 *
 * Kept separate from `index.ts` so tests can build an app against a throwaway
 * database without binding a port.
 */
export function createApp(
  env: Env,
  db: Database,
  auth: Auth,
  storage?: Storage | undefined,
): OpenAPIHono<AppEnv> {
  const app = new OpenAPIHono<AppEnv>({ defaultHook: refuseInvalidRequest })

  // First, so every later handler and every log line can quote the same id.
  app.use('*', requestId())

  // Both browser-facing prefixes, not just /admin: the auth routes live under
  // /api/auth, so a rule covering only /admin would fail every sign-in at the
  // preflight and look like a Better Auth bug.
  const browserFacing = cors({
    origin: env.DASHBOARD_ORIGIN,
    credentials: true,
    allowHeaders: ['content-type', 'authorization'],
  })
  app.use('/admin/*', browserFacing)
  app.use('/api/auth/*', browserFacing)

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

  // Better Auth owns its whole route tree; it is not described in our OpenAPI
  // document because it publishes its own.
  app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

  app.use('/admin/*', requireSession(auth))

  // Refused while streaming, before anything is buffered: without this the
  // server holds a whole oversized upload in memory only to reject it, which is
  // the shape of a trivially cheap denial of service.
  app.use(
    '/admin/projects/:projectId/assets',
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: (c) =>
        c.json(
          buildApiError(
            'bad_request',
            `That file is over the ${describeBytes(MAX_UPLOAD_BYTES)} limit.`,
            c.get('requestId'),
          ),
          413,
        ),
    }),
  )

  // Scopes are mounted per path prefix, so a read key that leaks from a
  // customer's deployment cannot be used to rewrite their content schema, and
  // the key their site builds with cannot read work nobody has published.
  app.use('/v1/content/*', requireApiKey(db, 'content:read'))
  app.use('/v1/preview/content/*', requireApiKey(db, 'content:read:draft'))
  app.on('GET', '/v1/schema/*', requireApiKey(db, 'content:read'))
  app.on('POST', '/v1/schema/*', requireApiKey(db, 'schema:write'))

  registerHealthRoutes(app, db)
  registerContentRoutes(app, db, storage)
  registerAssetRoutes(app, db, storage)
  registerSchemaRoutes(app, db)
  registerAdminProjectRoutes(app, db, storage)
  registerAdminEditorRoutes(app, db, storage)
  registerAdminAssetRoutes(app, db, storage)
  registerAdminApiKeyRoutes(app, db)
  registerAdminHistoryRoutes(app, db)
  registerAdminRollbackRoutes(app, db)

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
