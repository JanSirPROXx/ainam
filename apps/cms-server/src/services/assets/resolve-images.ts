import type { ContentValue, ResolvedImage } from '@ainam/schema'
import type { Database } from '../../db/client'
import type { ContentMap } from '../../repositories/content'
import { createAssetRepository } from '../../repositories/assets'
import type { Storage } from '../../storage'

interface StoredImage {
  assetId: string
  alt: string
}

/** A stored image value is exactly these two fields; anything else is not one. */
function asStoredImage(value: unknown): StoredImage | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Partial<StoredImage>
  if (typeof candidate.assetId !== 'string' || typeof candidate.alt !== 'string') return undefined
  return { assetId: candidate.assetId, alt: candidate.alt }
}

/** Every asset id in a set of values, including the ones inside list items. */
function collectAssetIds(values: Iterable<unknown>): string[] {
  const ids = new Set<string>()

  const visit = (value: unknown): void => {
    const image = asStoredImage(value)
    if (image) {
      ids.add(image.assetId)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) Object.values(item).forEach(visit)
      }
    }
  }

  for (const value of values) visit(value)
  return [...ids]
}

export type ImageResolver = (value: ContentValue) => ContentValue

/**
 * Prepares to replace every stored image with one a browser can render.
 *
 * A content row holds only `{ assetId, alt }`, because a URL written into
 * content goes stale the moment storage moves or a CDN appears in front of it.
 * The URL, width and height are spliced in per response instead — one query for
 * every value handed in, not one per image.
 *
 * `ainam pull` reads the content endpoint, so the build-time snapshot inherits
 * absolute URLs and a site keeps rendering its images with cms-server entirely
 * down. That is the point of doing it here rather than in the SDK.
 *
 * Takes the values up front so the query happens once. The editor view needs
 * the same resolution across a different shape, which is why this is a resolver
 * rather than a function over a content map.
 */
export async function createImageResolver(
  db: Database,
  storage: Storage | undefined,
  projectId: string,
  values: Iterable<ContentValue>,
): Promise<ImageResolver> {
  const ids = collectAssetIds(values)
  if (ids.length === 0 || !storage) return (value) => value

  const records = await createAssetRepository(db).findByIds(projectId, ids)
  const byId = new Map(records.map((record) => [record.id, record]))

  const resolve: ImageResolver = (value) => {
    const image = asStoredImage(value)
    if (image) {
      const record = byId.get(image.assetId)
      // An asset id with no row is left as it was: the site's `ainamImageProps`
      // returns null for a value with no url, so the page renders without the
      // image rather than failing. That happens when a bucket is restored from
      // an older backup, and losing the page would be the worse outcome.
      if (!record) return value

      const resolved: ResolvedImage = {
        assetId: record.id,
        alt: image.alt,
        url: storage.urlFor(projectId, record.id, record.storageKey),
        width: record.width,
        height: record.height,
      }
      return resolved
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        Object.fromEntries(
          Object.entries(item).map(([key, entry]) => [key, resolve(entry as ContentValue)]),
        ),
      ) as ContentValue
    }

    return value
  }

  return resolve
}

/** The whole of one content response. */
export async function resolveImages(
  db: Database,
  storage: Storage | undefined,
  projectId: string,
  content: ContentMap,
): Promise<ContentMap> {
  const resolve = await createImageResolver(db, storage, projectId, Object.values(content))
  return Object.fromEntries(Object.entries(content).map(([key, value]) => [key, resolve(value)]))
}
