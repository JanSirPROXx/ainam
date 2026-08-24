import type { ApiKeyScope } from '@ainam/schema'
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { projects } from './projects'

/**
 * Credentials a website uses to read its own published content.
 *
 * Deliberately ours rather than Better Auth's key plugin: that plugin scopes a
 * key to a `userId`, so a key issued by an editor who later leaves keeps
 * working, and deleting a project strands its keys instead of cascading. A key
 * belongs to a project, not to a person.
 *
 * Only `keyHash` is stored. A database dump must not yield working credentials,
 * so the plaintext key is shown exactly once, at creation.
 */
export const projectApiKeys = pgTable(
  'project_api_keys',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // A read key lives in a customer's deployment environment and can leak, so
    // rewriting the schema is a separate capability rather than an implied one.
    scopes: jsonb('scopes').$type<ApiKeyScope[]>().notNull().default(['content:read']),
    keyHash: text('key_hash').notNull(),
    /** Leading characters, kept in clear so a key is identifiable in a list. */
    prefix: text('prefix').notNull(),
    /** Coarse — updated at most once a minute, so reads stay cheap. */
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Set instead of deleting, so a revoked key stays auditable. */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    uniqueIndex('project_api_keys_hash_idx').on(table.keyHash),
    index('project_api_keys_project_idx').on(table.projectId),
  ],
)
