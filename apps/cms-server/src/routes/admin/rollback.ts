import {
  restoreResultSchema,
  restoreVersionRequestSchema,
  revertPublishRequestSchema,
} from '@ainam/schema'
import { type OpenAPIHono, createRoute } from '@hono/zod-openapi'
import type { Database } from '../../db/client'
import type { AppEnv } from '../../http/context'
import { requireProjectPermission } from '../../services/project-access'
import { restoreVersion, revertPublish } from '../../services/restore'
import { projectParams } from '../../http/params'
import { authorOf, webhookTargetOf } from './context'

const restoreRoute = createRoute({
  method: 'post',
  path: '/admin/projects/{projectId}/restore',
  summary: 'Put one key back to an earlier version',
  description:
    'Writes the draft as well as the live value, so the replaced value does not return on the ' +
    'next unrelated publish. Recorded as a new version, so the restore is itself undoable.',
  request: { params: projectParams, body: { content: { 'application/json': { schema: restoreVersionRequestSchema } } } },
  responses: {
    200: {
      content: { 'application/json': { schema: restoreResultSchema } },
      description: 'What went back live.',
    },
  },
})

const revertRoute = createRoute({
  method: 'post',
  path: '/admin/projects/{projectId}/revert',
  summary: 'Undo one publish',
  description:
    'Republishes what each of the publish\'s keys said beforehand, as one new publish. A key the ' +
    'publish introduced has no earlier state and is reported in `skipped` rather than blanked.',
  request: { params: projectParams, body: { content: { 'application/json': { schema: revertPublishRequestSchema } } } },
  responses: {
    200: {
      content: { 'application/json': { schema: restoreResultSchema } },
      description: 'What went back live, and what could not.',
    },
  },
})

export function registerAdminRollbackRoutes(app: OpenAPIHono<AppEnv>, db: Database): void {
  app.openapi(restoreRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const project = await requireProjectPermission(db, projectId, c.get('user').id, 'content:restore')
    const result = await restoreVersion(
      db,
      projectId,
      c.req.valid('json'),
      authorOf(c.get('user')),
      webhookTargetOf(project),
    )
    return c.json(result)
  })

  app.openapi(revertRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const project = await requireProjectPermission(db, projectId, c.get('user').id, 'content:restore')
    const result = await revertPublish(
      db,
      projectId,
      c.req.valid('json'),
      authorOf(c.get('user')),
      webhookTargetOf(project),
    )
    return c.json(result)
  })
}
