import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { projects } from './projects'

/**
 * An uploaded file.
 *
 * Only the metadata lives here; bytes live in S3-compatible storage under
 * `storageKey`. Keeping the bucket out of the row means self-hosted MinIO and
 * cloud R2 are the same code path.
 */
export const assets = pgTable('assets', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
  storageKey: text('storage_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
