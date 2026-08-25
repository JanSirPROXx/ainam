import type { Author, ContentSchema, ContentValue } from '@ainam/schema'
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { projects } from './projects'

export const contentStatus = pgEnum('content_status', ['draft', 'published'])

/** The code-first schema a project last pushed. One row per project. */
export const contentSchemas = pgTable('content_schemas', {
  projectId: text('project_id')
    .primaryKey()
    .references(() => projects.id, { onDelete: 'cascade' }),
  schema: jsonb('schema').$type<ContentSchema>().notNull(),
  /**
   * The keys in the order the developer declared them.
   *
   * Kept beside the schema rather than derived from it: JSONB normalises object
   * key order — by length, then bytes — so reading the order back out of the
   * document lists a customer's fields in an order nobody chose. It surfaces as
   * an editor where the hero subtitle sits between two pricing fields.
   */
  keyOrder: jsonb('key_order').$type<string[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Current content, one row per status.
 *
 * Draft and published are separate rows rather than two columns so the public
 * content API is a plain `where status = 'published'` — the hot read path never
 * has to know that drafts exist.
 */
export const contentEntries = pgTable(
  'content_entries',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    locale: text('locale').notNull(),
    status: contentStatus('status').notNull().default('draft'),
    value: jsonb('value').$type<ContentValue>(),
    version: integer('version').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: jsonb('updated_by').$type<Author>().notNull(),
  },
  (table) => [
    uniqueIndex('content_entries_identity_idx').on(
      table.projectId,
      table.key,
      table.locale,
      table.status,
    ),
    index('content_entries_published_idx').on(table.projectId, table.locale, table.status),
  ],
)

/**
 * Append-only history behind rollback.
 *
 * Rows are never updated or deleted: a customer must always be able to get back
 * to what their site said before an edit.
 */
export const contentVersions = pgTable(
  'content_versions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    locale: text('locale').notNull(),
    version: integer('version').notNull(),
    value: jsonb('value').$type<ContentValue>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    author: jsonb('author').$type<Author>().notNull(),
    /**
     * The publish this row went live in, shared by every key in that publish.
     *
     * Without it a publish is not an object anyone can point at, and "undo what
     * I just published" would have to be reconstructed from timestamps — which
     * is a guess, not an identity.
     */
    publishId: text('publish_id').notNull(),
  },
  (table) => [
    uniqueIndex('content_versions_identity_idx').on(
      table.projectId,
      table.key,
      table.locale,
      table.version,
    ),
    // Serves the publish history: keyset pagination reads it in exactly this
    // order, so a page never repeats or skips a row when a publish lands
    // between two requests.
    index('content_versions_publish_idx').on(
      table.projectId,
      table.locale,
      table.createdAt,
      table.publishId,
    ),
  ],
)
