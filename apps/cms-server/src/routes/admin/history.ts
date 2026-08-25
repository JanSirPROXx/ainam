import {
  contentKeySchema,
  contentVersionPageSchema,
  historyQuerySchema,
  publishEventPageSchema,
} from '@ainam/schema'
import { type OpenAPIHono, createRoute } from '@hono/zod-openapi'
import type { Database } from '../../db/client'
import type { AppEnv } from '../../http/context'
import { projectParams } from '../../http/params'
import { HttpError } from '../../http/errors'
import { decodePublishCursor, decodeVersionCursor, encodePublishCursor } from '../../lib/cursor'
import { createHistoryRepository } from '../../repositories/history'
import { resolveAuthorNames } from '../../services/authors'
import { requireProjectPermission } from '../../services/project-access'

/** Turns a rejected cursor into a message, rather than a silent first page. */
function refuseCursor(): never {
  throw new HttpError(
    400,
    'bad_request',
    'The cursor is not one this server issued. Drop it to start from the newest entry.',
  )
}

const versionsRoute = createRoute({
  method: 'get',
  path: '/admin/projects/{projectId}/versions',
  summary: 'What one key said in the past, newest first',
  request: { params: projectParams, query: historyQuerySchema.extend({ key: contentKeySchema }) },
  responses: {
    200: {
      content: { 'application/json': { schema: contentVersionPageSchema } },
      description: 'One page of a key\'s history.',
    },
  },
})

const publishesRoute = createRoute({
  method: 'get',
  path: '/admin/projects/{projectId}/publishes',
  summary: 'Publishes for one locale, newest first',
  request: { params: projectParams, query: historyQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: publishEventPageSchema } },
      description: 'One page of publish history.',
    },
  },
})

export function registerAdminHistoryRoutes(app: OpenAPIHono<AppEnv>, db: Database): void {
  const history = createHistoryRepository(db)

  app.openapi(versionsRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const project = await requireProjectPermission(db, projectId, c.get('user').id, 'content:edit')
    const { key, locale, cursor, limit } = c.req.valid('query')
    const inLocale = locale ?? project.defaultLocale

    const before = cursor === undefined ? undefined : (decodeVersionCursor(cursor) ?? refuseCursor())
    // One more than asked for, so "is there another page" is answered by the
    // query rather than by guessing from a full page.
    const rows = await history.listVersions({ projectId, key, locale: inLocale }, before, limit + 1)
    const versions = rows.slice(0, limit)

    return c.json({
      key,
      locale: inLocale,
      versions,
      nextCursor:
        rows.length > limit ? String(versions[versions.length - 1]?.version ?? '') : null,
      people: await resolveAuthorNames(db, versions.map((version) => version.author)),
    })
  })

  app.openapi(publishesRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const project = await requireProjectPermission(db, projectId, c.get('user').id, 'content:edit')
    const { locale, cursor, limit } = c.req.valid('query')
    const inLocale = locale ?? project.defaultLocale

    const before = cursor === undefined ? undefined : (decodePublishCursor(cursor) ?? refuseCursor())
    const rows = await history.listPublishes(projectId, inLocale, before, limit + 1)
    const publishes = rows.slice(0, limit)
    const last = publishes[publishes.length - 1]

    return c.json({
      locale: inLocale,
      publishes,
      nextCursor:
        rows.length > limit && last
          ? encodePublishCursor(new Date(last.publishedAt), last.publishId)
          : null,
      people: await resolveAuthorNames(db, publishes.map((publish) => publish.author)),
    })
  })
}
