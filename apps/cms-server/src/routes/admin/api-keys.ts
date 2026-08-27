import { apiKeySummarySchema, createApiKeyRequestSchema, createdApiKeySchema } from '@ainam/schema'
import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Database } from '../../db/client'
import type { AppEnv } from '../../http/context'
import { HttpError } from '../../http/errors'
import { projectParams } from '../../http/params'
import { generateApiKey } from '../../lib/api-key'
import { createId } from '../../lib/ids'
import { createApiKeyRepository } from '../../repositories/api-keys'
import { requireProjectPermission } from '../../services/project-access'

const keyParams = projectParams.extend({ keyId: z.string().min(1) })

const listRoute = createRoute({
  method: 'get',
  path: '/admin/projects/{projectId}/api-keys',
  summary: 'The keys this project has issued',
  request: { params: projectParams },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ keys: z.array(apiKeySummarySchema) }) } },
      description: 'Keys, newest first. Never the key itself.',
    },
  },
})

const createKeyRoute = createRoute({
  method: 'post',
  path: '/admin/projects/{projectId}/api-keys',
  summary: 'Issue a key',
  description:
    'The key is returned once and never again — only its hash is stored, so a database dump ' +
    'yields no working credentials.',
  request: {
    params: projectParams,
    body: { content: { 'application/json': { schema: createApiKeyRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: createdApiKeySchema } },
      description: 'The new key, shown once.',
    },
  },
})

const revokeRoute = createRoute({
  method: 'delete',
  path: '/admin/projects/{projectId}/api-keys/{keyId}',
  summary: 'Revoke a key',
  description: 'Takes effect on the next request. The row is kept, so use stays auditable.',
  request: { params: keyParams },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ revoked: z.boolean() }) } },
      description: 'Whether this call was the one that revoked it.',
    },
  },
})

/**
 * Issuing the credential a site reads with.
 *
 * Gated on `apiKey:manage` rather than `project:manage`: this mints a
 * credential, which is a different decision from changing a setting, and an
 * editor must not be able to make either.
 */
export function registerAdminApiKeyRoutes(app: OpenAPIHono<AppEnv>, db: Database): void {
  const keys = createApiKeyRepository(db)

  app.openapi(listRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    await requireProjectPermission(db, projectId, c.get('user').id, 'apiKey:manage')

    const rows = await keys.listForProject(projectId)
    return c.json({
      keys: rows.map((row) => ({
        id: row.id,
        name: row.name,
        scopes: row.scopes,
        prefix: row.prefix,
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        revokedAt: row.revokedAt?.toISOString() ?? null,
      })),
    })
  })

  app.openapi(createKeyRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    const user = c.get('user')
    await requireProjectPermission(db, projectId, user.id, 'apiKey:manage')

    const { name, scopes } = c.req.valid('json')
    const generated = generateApiKey()

    const row = await keys.create({
      id: createId('key'),
      projectId,
      name,
      scopes,
      keyHash: generated.hash,
      prefix: generated.prefix,
      createdBy: user.id,
    })

    return c.json({
      id: row.id,
      name: row.name,
      scopes: row.scopes,
      prefix: row.prefix,
      key: generated.plaintext,
    })
  })

  app.openapi(revokeRoute, async (c) => {
    const { projectId, keyId } = c.req.valid('param')
    await requireProjectPermission(db, projectId, c.get('user').id, 'apiKey:manage')

    const revoked = await keys.revoke(projectId, keyId)
    if (!revoked) {
      throw new HttpError(404, 'not_found', `No active key ${keyId} in this project.`)
    }
    return c.json({ revoked })
  })
}
