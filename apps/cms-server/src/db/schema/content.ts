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
  },
  (table) => [
    uniqueIndex('content_versions_identity_idx').on(
      table.projectId,
      table.key,
      table.locale,
      table.version,
    ),
  ],
)
