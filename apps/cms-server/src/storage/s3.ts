import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import type { ObjectStore, StoredObject } from './object-store'

export interface S3StorageConfig {
  bucket: string
  region: string
  /** Set for anything that is not AWS S3 itself — MinIO, Garage, R2. */
  endpoint: string | undefined
  accessKeyId: string
  secretAccessKey: string
  /** MinIO and Garage need path-style addressing; S3 and R2 do not. */
  forcePathStyle: boolean
}

/** S3 caps one delete request at a thousand keys. */
const DELETE_BATCH = 1000

/**
 * The one implementation of the port.
 *
 * Endpoint and path-style addressing are configuration rather than constants
 * precisely so MinIO, Garage, R2 and S3 are a `.env` change. R2 additionally
 * wants region `auto`, which is why the region is configurable too rather than
 * inferred from the endpoint.
 */
export function createS3Storage(config: S3StorageConfig): ObjectStore {
  const client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Images are content-addressed by asset id, so a stored object never
          // changes. A year is the longest a browser will honour anyway.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      )
    },

    async get(key): Promise<StoredObject | undefined> {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        )
        if (!response.Body) return undefined

        return {
          body: response.Body.transformToWebStream(),
          contentType: response.ContentType ?? 'application/octet-stream',
          byteSize: response.ContentLength ?? 0,
        }
      } catch (error) {
        if (isNotFound(error)) return undefined
        throw error
      }
    },

    async deletePrefix(prefix) {
      let removed = 0
      let continuationToken: string | undefined

      do {
        const listed = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: prefix,
            ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
            MaxKeys: DELETE_BATCH,
          }),
        )

        const keys = (listed.Contents ?? []).flatMap((object) =>
          object.Key ? [{ Key: object.Key }] : [],
        )
        if (keys.length > 0) {
          await client.send(
            new DeleteObjectsCommand({
              Bucket: config.bucket,
              Delete: { Objects: keys, Quiet: true },
            }),
          )
          removed += keys.length
        }

        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
      } while (continuationToken)

      return removed
    },
  }
}

/** Every S3-compatible server spells this differently; all of them 404. */
function isNotFound(error: unknown): boolean {
  const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
  const name = (error as { name?: string })?.name
  return status === 404 || name === 'NoSuchKey' || name === 'NotFound'
}
