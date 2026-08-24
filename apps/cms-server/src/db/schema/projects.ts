import { jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

/**
 * A website connected to AINAM.
 *
 * `organizationId` references the table Better Auth's organization plugin owns,
 * so there is no foreign key here — the auth tables are generated separately and
 * a cross-schema constraint would couple our migrations to theirs.
 */
export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    defaultLocale: text('default_locale').notNull().default('en'),
    locales: jsonb('locales').$type<string[]>().notNull().default(['en']),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('projects_organization_slug_idx').on(table.organizationId, table.slug)],
)
