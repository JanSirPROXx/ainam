import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Database } from '../../db/client'
import type { AppEnv } from '../../http/context'
import { createProjectRepository } from '../../repositories/projects'

const projectSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  defaultLocale: z.string(),
  locales: z.array(z.string()),
  role: z.string(),
})

const listRoute = createRoute({
  method: 'get',
  path: '/admin/projects',
  summary: 'Projects the signed-in user can edit',
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ projects: z.array(projectSchema) }) } },
      description: 'Projects reachable through the user\'s organisation memberships.',
    },
  },
})

export function registerAdminProjectRoutes(app: OpenAPIHono<AppEnv>, db: Database): void {
  const projects = createProjectRepository(db)

  app.openapi(listRoute, async (c) => {
    const rows = await projects.listForUser(c.get('user').id)
    // Mapped field by field, not spread: the repository row carries the
    // project's webhook secret, and handing the raw row to the browser would
    // publish it to anyone who opens devtools.
    return c.json({
      projects: rows.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        name: row.name,
        slug: row.slug,
        defaultLocale: row.defaultLocale,
        locales: row.locales,
        role: row.role,
      })),
    })
  })
}
