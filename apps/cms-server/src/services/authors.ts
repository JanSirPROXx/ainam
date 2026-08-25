import type { Author, AuthorNames } from '@ainam/schema'
import { inArray } from 'drizzle-orm'
import type { Database } from '../db/client'
import { users } from '../db/schema'

/**
 * Resolves the names behind a page of authors.
 *
 * History stores a user id rather than a name, so a rename does not rewrite the
 * past — but a list of ids is unreadable. One query per page rather than one per
 * row, and it covers people who have since left the organisation, whose edits
 * are still in the history.
 */
export async function resolveAuthorNames(db: Database, authors: Author[]): Promise<AuthorNames> {
  const ids = [...new Set(authors.flatMap((author) => (author.kind === 'user' ? [author.id] : [])))]
  if (ids.length === 0) return {}

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, ids))

  return Object.fromEntries(rows.map((row) => [row.id, row.name || row.email]))
}
