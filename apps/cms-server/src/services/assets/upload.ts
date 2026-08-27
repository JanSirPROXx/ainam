import type { AssetSummary } from '@ainam/schema'
import { createHash } from 'node:crypto'
import type { Database } from '../../db/client'
import { createId } from '../../lib/ids'
import { createAssetRepository, toAssetSummary } from '../../repositories/assets'
import { type Storage, storageKeyFor } from '../../storage'
import { decodeImage } from './decode-image'

const STORED_MIME_TYPE = 'image/webp'

/**
 * Stores one uploaded image.
 *
 * The bytes are re-encoded rather than passed through: what lands in the bucket
 * is a WebP this server produced, so nothing a caller supplied is ever served
 * back to a browser verbatim.
 *
 * Deduplicated on the checksum of the *stored* bytes, not the upload — the same
 * photo exported twice at different quality is two files, while the same file
 * uploaded twice is one row and one object.
 */
export async function uploadImage(
  db: Database,
  storage: Storage,
  projectId: string,
  file: { filename: string; bytes: Buffer },
): Promise<AssetSummary> {
  const image = await decodeImage(file.bytes, file.filename)
  const checksum = createHash('sha256').update(image.bytes).digest('hex')

  const assetRepository = createAssetRepository(db)
  const existing = await assetRepository.findByChecksum(projectId, checksum)
  if (existing) {
    return toAssetSummary(existing, storage.urlFor(projectId, existing.id, existing.storageKey))
  }

  const assetId = createId('ast')
  const storageKey = storageKeyFor(projectId, assetId)

  // Bytes first: an object with no row is invisible and costs a little storage,
  // while a row with no object is a broken image on a customer's live page.
  await storage.store.put(storageKey, image.bytes, STORED_MIME_TYPE)

  const record = await assetRepository.create({
    id: assetId,
    projectId,
    filename: file.filename,
    mimeType: STORED_MIME_TYPE,
    byteSize: image.bytes.byteLength,
    checksum,
    width: image.width,
    height: image.height,
    storageKey,
  })

  return toAssetSummary(record, storage.urlFor(projectId, assetId, storageKey))
}
