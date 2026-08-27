import {
  localeSchema,
  previewLinkSchema,
  projectSummarySchema,
  updateProjectRequestSchema,
} from '@ainam/schema'
import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Database } from '../../db/client'
import type { AppEnv } from '../../http/context'
import { projectParams } from '../../http/params'
import { generateWebhookSecret } from '../../lib/api-key'
import { createProjectRepository, toProjectSummary } from '../../repositories/projects'
import { deleteProjectObjects } from '../../services/assets/delete-objects'
import { createPreviewLink } from '../../services/preview-link'
import { requireProject, requireProjectPermission } from '../../services/project-access'
import type { Storage } from '../../storage'

const listRoute = createRoute({
  method: 'get',
  path: '/admin/projects',
  summary: 'Projects the signed-in user can edit',
  responses: {
    200: {
      content: {
        'application/json': { schema: z.object({ projects: z.array(projectSummarySchema) }) },
      },
      description: "Projects reachable through the user's organisation memberships.",
    },
  },
})

const readRoute = createRoute({
  method: 'get',
  path: '/admin/projects/{projectId}',
  summary: 'One project, with its webhook and preview settings',
  request: { params: projectParams },
  responses: {
    200: {
      content: { 'application/json': { schema: projectSummarySchema } },
      description: 'The project. Never its webhook secret.',
    },
  },
})

const updateRoute = createRoute({
  method: 'patch',
  path: '/admin/projects/{projectId}',
  summary: 'Change a project\'s name, webhook or preview URL',
  request: { params: projectParams, body: { content: { 'application/json': { schema: updateProjectRequestSchema } } } },
  responses: {
    200: {
      content: { 'application/json': { schema: projectSummarySchema } },
      description: 'The project as it now stands.',
    },
  },
})

const secretRoute = createRoute({
  method: 'post',
  path: '/admin/projects/{projectId}/webhook-secret',
  summary: 'Replace the secret that signs publishes and preview links',
  description:
    'Returned once. Put it in the site as AINAM_WEBHOOK_SECRET — until you do, publishes will ' +
    'reach the site and be rejected, and preview links will not open.',
  request: { params: projectParams },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ webhookSecret: z.string() }) } },
      description: 'The new secret, shown once.',
    },
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/admin/projects/{projectId}',
  summary: 'Delete a project and everything in it',
  description:
    'Removes the content, its history, its keys and its uploaded images. There is no undo, and ' +
    'any site still reading with one of its keys stops receiving content.',
  request: { params: projectParams },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ deleted: z.boolean() }) } },
      description: 'The project is gone.',
    },
  },
})

const previewRoute = createRoute({
  method: 'get',
  path: '/admin/projects/{projectId}/preview-link',
  summary: 'A short-lived signed link that shows drafts on the live site',
  request: { params: projectParams, query: z.object({ locale: localeSchema.optional() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: previewLinkSchema } },
      description: 'Where to send the person who wants to see the draft.',
    },
  },
})

export function registerAdminProjectRoutes(
  app: OpenAPIHono<AppEnv>,
  db: Database,
  storage?: Storage | undefined,
): void {
  const projects = createProjectRepository(db)

  app.openapi(listRoute, async (c) => {
    const rows = await projects.listForUser(c.get('user').id)
    // Mapped rather than spread: the repository row carries the project's
    // webhook secret, and handing it to the browser would publish it to anyone
    // who opens devtools.
    return c.json({ projects: rows.map(toProjectSummary) })
  })

  app.openapi(readRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const project = await requireProject(db, projectId, c.get('user').id)
    return c.json(toProjectSummary(project))
  })

  app.openapi(updateRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const userId = c.get('user').id
    await requireProjectPermission(db, projectId, userId, 'project:manage')

    await projects.update(projectId, c.req.valid('json'))
    return c.json(toProjectSummary(await requireProject(db, projectId, userId)))
  })

  app.openapi(secretRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    // Not `project:manage`: this mints a credential rather than changing a
    // setting, and the two are separable the moment a third role exists.
    await requireProjectPermission(db, projectId, c.get('user').id, 'apiKey:manage')

    const webhookSecret = generateWebhookSecret()
    await projects.setWebhookSecret(projectId, webhookSecret)
    return c.json({ webhookSecret })
  })

  app.openapi(deleteRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    await requireProjectPermission(db, projectId, c.get('user').id, 'project:manage')

    // Objects first: the row cascade takes the asset records with it, and once
    // they are gone nothing knows which bytes belonged to this project. The
    // keys are one prefix precisely so this is a single call.
    await deleteProjectObjects(storage, projectId)
    await projects.remove(projectId)

    return c.json({ deleted: true })
  })

  app.openapi(previewRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const project = await requireProjectPermission(db, projectId, c.get('user').id, 'content:edit')
    const { locale } = c.req.valid('query')
    return c.json(await createPreviewLink(project, locale ?? project.defaultLocale))
  })
}
