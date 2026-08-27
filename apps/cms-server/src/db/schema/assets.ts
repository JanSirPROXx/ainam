import { bigint, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { projects } from './projects'

/**
 * An uploaded image.
 *
 * Only the metadata lives here; bytes live in S3-compatible storage under
 * `storageKey`. Keeping the bucket out of the row means self-hosted MinIO and
 * cloud R2 are the same code path.
 *
 * A row is never deleted when an image is cleared from a field: a
 * `content_versions` row from last month still references this id, and rollback
 * has to keep working. Rows go only with their project.
 */
export const assets = pgTable(
  'assets',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
    /** Of the stored bytes, so re-uploading the same file reuses the same row. */
    checksum: text('checksum').notNull(),
    /** The stored image's own dimensions, so a layout can reserve the space. */
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    storageKey: text('storage_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Per project, not global: two customers uploading the same stock photo
    // must not end up sharing a row, or deleting one project would take the
    // other's image with it.
    uniqueIndex('assets_project_checksum_idx').on(table.projectId, table.checksum),
    index('assets_project_created_idx').on(table.projectId, table.createdAt),
  ],
)
