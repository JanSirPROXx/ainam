import { type OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq, and } from 'drizzle-orm'
import type { Database } from '../db/client'
import { assets } from '../db/schema'
import type { AppEnv } from '../http/context'
import { HttpError } from '../http/errors'
import type { Storage } from '../storage'

const route = createRoute({
  method: 'get',
  path: '/v1/assets/{projectId}/{assetId}',
  summary: 'The bytes of one uploaded image',
  description:
    'The fallback delivery mode, used when STORAGE_PUBLIC_URL is unset. Set that instead in ' +
    'production: serving a customer\'s images through this server makes our uptime their uptime.',
  request: {
    params: z.object({ projectId: z.string().min(1), assetId: z.string().min(1) }),
  },
  responses: {
    200: { description: 'The image.', content: { 'image/webp': { schema: z.string() } } },
  },
})

/**
 * Serves uploaded bytes when no public bucket URL is configured.
 *
 * Deliberately unauthenticated: this URL ends up in an `<img src>` on a public
 * page, and a browser cannot attach a credential to one. Access is by knowing
 * the asset id, which is twelve random bytes — the same model a bucket with
 * unguessable keys uses, and the reason ids are generated rather than counted.
 */
export function registerAssetRoutes(
  app: OpenAPIHono<AppEnv>,
  db: Database,
  storage: Storage | undefined,
): void {
  app.openapi(route, async (c) => {
    const { projectId, assetId } = c.req.valid('param')
    if (!storage) {
      throw new HttpError(404, 'not_found', 'This server has no object storage configured.')
    }

    const [record] = await db
      .select({ storageKey: assets.storageKey, mimeType: assets.mimeType })
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId)))
      .limit(1)
    if (!record) throw new HttpError(404, 'not_found', `No asset ${assetId} in project ${projectId}.`)

    const object = await storage.store.get(record.storageKey)
    if (!object) {
      // The row outlived its bytes, which happens when a bucket is restored
      // from an older backup. Saying so beats a 500 nobody can act on.
      throw new HttpError(
        404,
        'not_found',
        `Asset ${assetId} is recorded but its bytes are not in the bucket.`,
      )
    }

    return new Response(object.body, {
      headers: {
        'content-type': object.contentType || record.mimeType,
        'content-length': String(object.byteSize),
        // The bytes under an asset id never change, so this is safe to cache
        // for as long as a browser is willing to.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  })
}
