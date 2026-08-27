/**
 * Where uploaded bytes live.
 *
 * A port rather than direct S3 calls, because "no vendor lock-in in the core"
 * is a promise this is where it gets kept: MinIO, Garage, R2 and S3 differ only
 * in configuration, and a self-hoster must never have to change code to use the
 * storage they already run.
 */
export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>

  /**
   * Reads an object back for the streaming delivery mode.
   *
   * Returns undefined for a key that is not there — a missing object is an
   * ordinary 404, not an exception, because a content row can outlive its bytes
   * if a bucket was restored from an older backup.
   */
  get(key: string): Promise<StoredObject | undefined>

  /** Removes every object under a prefix. Returns how many went. */
  deletePrefix(prefix: string): Promise<number>
}

export interface StoredObject {
  body: ReadableStream<Uint8Array>
  contentType: string
  byteSize: number
}

/**
 * Where one asset's bytes live.
 *
 * A project's objects are one prefix, which is what makes deleting a project a
 * single `deletePrefix` rather than a walk over rows that may already be gone.
 * The variant segment is unused today and exists so a srcSet ladder can be
 * added without moving anything already stored.
 */
export function storageKeyFor(projectId: string, assetId: string, variant = 'original'): string {
  return `${projectId}/${assetId}/${variant}.webp`
}

export function projectPrefix(projectId: string): string {
  return `${projectId}/`
}
