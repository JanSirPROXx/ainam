import type { Env } from '../env'
import type { ObjectStore } from './object-store'
import { createS3Storage } from './s3'

export type { ObjectStore, StoredObject } from './object-store'
export { projectPrefix, storageKeyFor } from './object-store'

export interface Storage {
  store: ObjectStore
  /** Where a browser fetches this asset. */
  urlFor(projectId: string, assetId: string, storageKey: string): string
  /** Whether bytes travel through this server rather than straight from the bucket. */
  servesBytes: boolean
}

/**
 * Builds the storage layer, or nothing when none is configured.
 *
 * Optional rather than required: an instance whose sites use no images should
 * not have to run object storage, and failing at startup would break every
 * deployment that predates this. The upload route says what to set instead.
 */
export function createStorage(env: Env): Storage | undefined {
  if (!env.STORAGE_BUCKET || !env.STORAGE_ACCESS_KEY_ID || !env.STORAGE_SECRET_ACCESS_KEY) {
    return undefined
  }

  const store = createS3Storage({
    bucket: env.STORAGE_BUCKET,
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
  })

  const publicBase = env.STORAGE_PUBLIC_URL?.replace(/\/+$/, '')

  return {
    store,
    servesBytes: publicBase === undefined,
    urlFor(projectId, assetId, storageKey) {
      // With a public base, bytes go from the bucket or its CDN straight to the
      // visitor and never touch this server. Without one, they stream through
      // the content API — which works from a clean checkout with no bucket
      // policy, and makes us a single point of failure for a customer's images.
      if (publicBase !== undefined) return `${publicBase}/${storageKey}`
      return `${env.BETTER_AUTH_URL.replace(/\/+$/, '')}/v1/assets/${projectId}/${assetId}`
    },
  }
}
