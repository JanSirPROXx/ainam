import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'

const healthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
})

const route = createRoute({
  method: 'get',
  path: '/health',
  summary: 'Liveness and database connectivity',
  responses: {
    200: {
      content: { 'application/json': { schema: healthResponse } },
      description: 'The server is running. Check `database` for dependency state.',
    },
  },
})

export function registerHealthRoutes(app: OpenAPIHono, db: Database): void {
  app.openapi(route, async (c) => {
    let database: 'up' | 'down' = 'up'
    try {
      await db.execute(sql`select 1`)
    } catch {
      database = 'down'
    }
    return c.json({ status: database === 'up' ? 'ok' : 'degraded', database } as const)
  })
}
