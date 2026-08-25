import { localeSchema } from '@ainam/schema'
import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Database } from '../db/client'
import type { AppEnv } from '../http/context'
import { HttpError } from '../http/errors'
import { projectParams } from '../http/params'
import { assertKeyOwnsProject } from '../http/project-scope'
import { createContentRepository } from '../repositories/content'

const query = z.object({ locale: localeSchema.optional() })
const contentMap = z.record(z.string(), z.unknown())

const publishedRoute = createRoute({
  method: 'get',
  path: '/v1/content/{projectId}',
  summary: 'Published content for one project and locale',
  description:
    'The only endpoint a live site calls. Returns a bare map of content key to value, so a ' +
    'consumer needs no unwrapping and no knowledge of our envelope.',
  security: [{ apiKey: [] }],
  request: { params: projectParams, query },
  responses: {
    200: {
      content: { 'application/json': { schema: contentMap } },
      description: 'Content keyed by content key.',
    },
  },
})

const previewRoute = createRoute({
  method: 'get',
  path: '/v1/preview/content/{projectId}',
  summary: 'Draft content for one project and locale',
  description:
    'What the site would say if everything currently in the editor were published. Keys with no ' +
    'draft fall back to their published value, so a preview renders a complete page. Needs a key ' +
    'carrying `content:read:draft` — the build key deliberately cannot read this.',
  security: [{ apiKey: [] }],
  request: { params: projectParams, query },
  responses: {
    200: {
      content: { 'application/json': { schema: contentMap } },
      description: 'Draft content keyed by content key.',
    },
  },
})

export function registerContentRoutes(app: OpenAPIHono<AppEnv>, db: Database): void {
  const content = createContentRepository(db)

  /** The project a key may read comes from the key, never from the URL. */
  async function resolveProject(projectId: string, requested: string | undefined) {
    const project = await content.findProject(projectId)
    if (!project) {
      throw new HttpError(404, 'not_found', `Project ${projectId} was not found on this server.`)
    }
    return { project, locale: requested ?? project.defaultLocale }
  }

  app.openapi(publishedRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    assertKeyOwnsProject(c, projectId)

    const { project, locale } = await resolveProject(projectId, c.req.valid('query').locale)
    return c.json(await content.findPublished(projectId, locale, project.defaultLocale))
  })

  app.openapi(previewRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    assertKeyOwnsProject(c, projectId)

    const { project, locale } = await resolveProject(projectId, c.req.valid('query').locale)
    return c.json(await content.findDrafts(projectId, locale, project.defaultLocale))
  })
}
