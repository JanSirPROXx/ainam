import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { localeSchema } from '@ainam/schema'
import type { Database } from '../db/client'
import type { AppEnv } from '../http/context'
import { HttpError } from '../http/errors'
import { requireApiKey } from '../middleware/api-key'
import { createContentRepository } from '../repositories/content'

const route = createRoute({
  method: 'get',
  path: '/v1/content/{projectId}',
  summary: 'Published content for one project and locale',
  description:
    'The only endpoint a live site calls. Returns a bare map of content key to value, so a ' +
    'consumer needs no unwrapping and no knowledge of our envelope.',
  security: [{ apiKey: [] }],
  request: {
    params: z.object({ projectId: z.string().min(1) }),
    query: z.object({ locale: localeSchema.optional() }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } },
      description: 'Content keyed by content key.',
    },
  },
})

export function registerContentRoutes(app: OpenAPIHono<AppEnv>, db: Database): void {
  const content = createContentRepository(db)

  app.use('/v1/*', requireApiKey(db))

  app.openapi(route, async (c) => {
    const { projectId } = c.req.valid('param')

    // The key decides which project is readable. A mismatch is reported as
    // "not found" rather than "forbidden": confirming that a project exists to
    // someone holding a key for a different one is itself a disclosure.
    if (projectId !== c.get('projectId')) {
      throw new HttpError(
        404,
        'not_found',
        `Project ${projectId} was not found on this server. Check projectId and that the API key belongs to it.`,
      )
    }

    const project = await content.findProject(projectId)
    if (!project) {
      throw new HttpError(404, 'not_found', `Project ${projectId} was not found on this server.`)
    }

    const { locale } = c.req.valid('query')
    const requested = locale ?? project.defaultLocale
    return c.json(await content.findPublished(projectId, requested, project.defaultLocale))
  })
}
