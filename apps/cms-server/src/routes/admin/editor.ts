import {
  editorViewSchema,
  localeSchema,
  publishRequestSchema,
  publishResultSchema,
  saveDraftRequestSchema,
  saveDraftResultSchema,
} from '@ainam/schema'
import type { Author } from '@ainam/schema'
import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Database } from '../../db/client'
import type { AppEnv, SessionUser } from '../../http/context'
import { HttpError } from '../../http/errors'
import { createEditorRepository } from '../../repositories/editor'
import { saveDraft } from '../../services/editor'
import { requireProject } from '../../services/project-access'
import { publishContent } from '../../services/publish'

const params = z.object({ projectId: z.string().min(1) })

function authorOf(user: SessionUser): Author {
  return { kind: 'user', id: user.id }
}

const viewRoute = createRoute({
  method: 'get',
  path: '/admin/projects/{projectId}/content',
  summary: 'Every editable key in one locale, with its draft and published value',
  request: { params, query: z.object({ locale: localeSchema.optional() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: editorViewSchema } },
      description: 'The editor view.',
    },
  },
})

const saveRoute = createRoute({
  method: 'patch',
  path: '/admin/projects/{projectId}/content',
  summary: 'Save draft edits',
  description:
    'All or nothing. A key whose stored version has moved since the editor loaded it is a ' +
    'conflict, and the whole batch is refused.',
  request: {
    params,
    body: { content: { 'application/json': { schema: saveDraftRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: saveDraftResultSchema } },
      description: 'New version numbers for the saved keys.',
    },
  },
})

const publishRoute = createRoute({
  method: 'post',
  path: '/admin/projects/{projectId}/publish',
  summary: 'Make the draft the live copy',
  request: {
    params,
    body: { content: { 'application/json': { schema: publishRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: publishResultSchema } },
      description: 'What went live.',
    },
  },
})

export function registerAdminEditorRoutes(app: OpenAPIHono<AppEnv>, db: Database): void {
  const editor = createEditorRepository(db)

  app.openapi(viewRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const project = await requireProject(db, projectId, c.get('user').id)
    const { locale } = c.req.valid('query')

    const view = await editor.loadView(projectId, locale ?? project.defaultLocale)
    if (!view) {
      throw new HttpError(
        404,
        'not_found',
        `Project ${projectId} has no content schema yet. Run "ainam push" from the website's codebase.`,
      )
    }
    return c.json(view)
  })

  app.openapi(saveRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    await requireProject(db, projectId, c.get('user').id)
    const result = await saveDraft(db, projectId, c.req.valid('json'), authorOf(c.get('user')))
    return c.json(result)
  })

  app.openapi(publishRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const project = await requireProject(db, projectId, c.get('user').id)
    const result = await publishContent(db, projectId, c.req.valid('json'), authorOf(c.get('user')), {
      url: project.webhookUrl,
      secret: project.webhookSecret,
    })
    return c.json(result)
  })
}
