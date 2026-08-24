import { jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { organizations } from './auth'

/**
 * A website connected to AINAM.
 *
 * Better Auth's tables are generated into `auth.ts` and committed, so they live
 * in our own migration set — which is what lets this carry a real foreign key.
 * Deleting an organization must take its projects with it; an orphaned project
 * would be content nobody can reach and nobody can remove.
 */
export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    defaultLocale: text('default_locale').notNull().default('en'),
    locales: jsonb('locales').$type<string[]>().notNull().default(['en']),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('projects_organization_slug_idx').on(table.organizationId, table.slug)],
)
