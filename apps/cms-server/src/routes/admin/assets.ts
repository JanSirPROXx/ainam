import { MAX_UPLOAD_BYTES, assetPageSchema, assetSummarySchema, describeBytes } from '@ainam/schema'
import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { Database } from '../../db/client'
import type { AppEnv } from '../../http/context'
import { HttpError } from '../../http/errors'
import { projectParams } from '../../http/params'
import { createAssetRepository, toAssetSummary } from '../../repositories/assets'
import { uploadImage } from '../../services/assets/upload'
import { requireProjectPermission } from '../../services/project-access'
import type { Storage } from '../../storage'

/** Enough to fill the picker without paging it in the MVP. */
const LIST_LIMIT = 200

const uploadRoute = createRoute({
  method: 'post',
  path: '/admin/projects/{projectId}/assets',
  summary: 'Upload an image',
  description:
    'Multipart, one `file` field. The uploaded bytes are re-encoded to WebP, stripped of EXIF ' +
    'and capped on the long edge; the format is decided by decoding the header, never by the ' +
    'filename or the declared type.',
  request: {
    params: projectParams,
    body: {
      content: {
        'multipart/form-data': { schema: z.object({ file: z.any() }) },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: assetSummarySchema } },
      description: 'The stored image.',
    },
  },
})

const listRoute = createRoute({
  method: 'get',
  path: '/admin/projects/{projectId}/assets',
  summary: 'Images already uploaded to this project',
  request: { params: projectParams },
  responses: {
    200: {
      content: { 'application/json': { schema: assetPageSchema } },
      description: 'What the picker offers, newest first.',
    },
  },
})

function requireStorage(storage: Storage | undefined): Storage {
  if (storage) return storage
  throw new HttpError(
    503,
    'internal',
    'This server has no object storage configured, so images cannot be uploaded. Set ' +
      'STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY.',
  )
}

export function registerAdminAssetRoutes(
  app: OpenAPIHono<AppEnv>,
  db: Database,
  storage: Storage | undefined,
): void {
  app.openapi(uploadRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    await requireProjectPermission(db, projectId, c.get('user').id, 'content:edit')
    const active = requireStorage(storage)

    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) {
      throw new HttpError(400, 'bad_request', 'Send the image as a multipart "file" field.')
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new HttpError(
        413,
        'bad_request',
        `That file is ${describeBytes(file.size)}. The limit is ${describeBytes(MAX_UPLOAD_BYTES)}.`,
      )
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    return c.json(await uploadImage(db, active, projectId, { filename: file.name, bytes }))
  })

  app.openapi(listRoute, async (c) => {
    const { projectId } = c.req.valid('param')
    await requireProjectPermission(db, projectId, c.get('user').id, 'content:edit')

    const repository = createAssetRepository(db)
    const records = await repository.listForProject(projectId, LIST_LIMIT)

    return c.json({
      assets: records.map((record) =>
        toAssetSummary(
          record,
          storage?.urlFor(projectId, record.id, record.storageKey) ?? '',
        ),
      ),
      storedBytes: await repository.storedBytes(projectId),
    })
  })
}
