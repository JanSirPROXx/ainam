import { contentSchemaSchema, schemaPushRequestSchema, schemaPushResultSchema } from '@ainam/schema'
import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Database } from '../db/client'
import type { AppEnv } from '../http/context'
import { HttpError } from '../http/errors'
import { createSchemaRepository } from '../repositories/schema'
import { pushContentSchema } from '../services/schema-push'

const route = createRoute({
  method: 'post',
  path: '/v1/schema/{projectId}',
  summary: 'Upload the content schema declared in the website codebase',
  description:
    'Called by `ainam push`. Newly added keys are seeded with their declared defaults in every ' +
    'locale, as both draft and published, so a fresh integration renders real copy. Keys that ' +
    'disappear are reported but keep their stored content.',
  security: [{ apiKey: [] }],
  request: {
    params: z.object({ projectId: z.string().min(1) }),
    body: { content: { 'application/json': { schema: schemaPushRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: schemaPushResultSchema } },
      description: 'What the push changed.',
    },
  },
})

const readRoute = createRoute({
  method: 'get',
  path: '/v1/schema/{projectId}',
  summary: 'The content schema currently stored for a project',
  description:
    'Called by `ainam pull` to generate TypeScript types, which is what turns a wrong content ' +
    'key into a compile error rather than a blank section.',
  security: [{ apiKey: [] }],
  request: { params: z.object({ projectId: z.string().min(1) }) },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            schema: contentSchemaSchema,
            locales: z.array(z.string()),
            defaultLocale: z.string(),
          }),
        },
      },
      description: 'The schema, and the locales it is published in.',
    },
  },
})

export function registerSchemaRoutes(app: OpenAPIHono<AppEnv>, db: Database): void {
  const schemas = createSchemaRepository(db)

  app.openapi(readRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    if (projectId !== c.get('projectId')) {
      throw new HttpError(
        404,
        'not_found',
        `Project ${projectId} was not found on this server. Check projectId and that the API key belongs to it.`,
      )
    }
    const stored = await schemas.findByProject(projectId)
    if (!stored) {
      throw new HttpError(
        404,
        'not_found',
        `Project ${projectId} has no schema yet. Run "ainam push" first.`,
      )
    }
    return c.json(stored)
  })

  app.openapi(route, async (c) => {
    const { projectId } = c.req.valid('param')
    if (projectId !== c.get('projectId')) {
      throw new HttpError(
        404,
        'not_found',
        `Project ${projectId} was not found on this server. Check projectId and that the API key belongs to it.`,
      )
    }

    const request = c.req.valid('json')
    if (!request.locales.includes(request.defaultLocale)) {
      throw new HttpError(
        400,
        'bad_request',
        `defaultLocale "${request.defaultLocale}" is not in locales [${request.locales.join(', ')}].`,
      )
    }

    return c.json(await pushContentSchema(db, projectId, request))
  })
}
