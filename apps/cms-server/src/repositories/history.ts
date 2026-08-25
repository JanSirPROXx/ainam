import type { ContentVersion, PublishEvent } from '@ainam/schema'
import { and, desc, eq, lt } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentVersions } from '../db/schema'
import type { PublishCursor } from '../lib/cursor'

interface KeyRef {
  projectId: string
  key: string
  locale: string
}

/**
 * A history row with the address it belongs to.
 *
 * `ContentVersion` deliberately omits key and locale — the editor already knows
 * both when it asks for one key's history. A revert does not: it starts from a
 * publish id and has to discover which keys that publish touched.
 */
export interface AddressedVersion extends ContentVersion {
  key: string
  locale: string
}

/**
 * One row of the grouped publish query, as Postgres returns it.
 *
 * Snake case and an index signature because this is a raw result, not a Drizzle
 * projection — `db.execute` hands back whatever the driver parsed.
 *
 * `published_at` is a string, not a Date, and the query formats it as ISO 8601
 * itself. Drizzle installs its own `timestamptz` parser that returns Postgres'
 * text form, and only converts it back on columns it selected through the query
 * builder — a raw query gets the string. Formatting in SQL is what makes this
 * independent of which parsers the driver happens to have installed.
 */
interface PublishRow extends Record<string, unknown> {
  publish_id: string
  published_at: string
  author: PublishEvent['author']
  keys: string[]
}

function toVersion(row: typeof contentVersions.$inferSelect): ContentVersion {
  return {
    version: row.version,
    value: row.value ?? null,
    createdAt: row.createdAt.toISOString(),
    author: row.author,
    publishId: row.publishId,
  }
}

export function createHistoryRepository(db: Database) {
  return {
    /** One key's past values, newest first. */
    async listVersions(ref: KeyRef, before: number | undefined, limit: number) {
      const filters = [
        eq(contentVersions.projectId, ref.projectId),
        eq(contentVersions.key, ref.key),
        eq(contentVersions.locale, ref.locale),
      ]
      if (before !== undefined) filters.push(lt(contentVersions.version, before))

      const rows = await db
        .select()
        .from(contentVersions)
        .where(and(...filters))
        .orderBy(desc(contentVersions.version))
        .limit(limit)
      return rows.map(toVersion)
    },

    async findVersion(ref: KeyRef, version: number): Promise<ContentVersion | undefined> {
      const [row] = await db
        .select()
        .from(contentVersions)
        .where(
          and(
            eq(contentVersions.projectId, ref.projectId),
            eq(contentVersions.key, ref.key),
            eq(contentVersions.locale, ref.locale),
            eq(contentVersions.version, version),
          ),
        )
        .limit(1)
      return row ? toVersion(row) : undefined
    },

    /** What the key said before the given version — the target of a revert. */
    async findPrecedingVersion(ref: KeyRef, version: number): Promise<ContentVersion | undefined> {
      const [row] = await db
        .select()
        .from(contentVersions)
        .where(
          and(
            eq(contentVersions.projectId, ref.projectId),
            eq(contentVersions.key, ref.key),
            eq(contentVersions.locale, ref.locale),
            lt(contentVersions.version, version),
          ),
        )
        .orderBy(desc(contentVersions.version))
        .limit(1)
      return row ? toVersion(row) : undefined
    },

    /** Every row one publish wrote, so a revert can address all of them. */
    async findPublishRows(projectId: string, publishId: string): Promise<AddressedVersion[]> {
      const rows = await db
        .select()
        .from(contentVersions)
        .where(
          and(eq(contentVersions.projectId, projectId), eq(contentVersions.publishId, publishId)),
        )
        .orderBy(contentVersions.key)
      return rows.map((row) => ({ ...toVersion(row), key: row.key, locale: row.locale }))
    },

    /**
     * Publishes, newest first, with the keys each one changed.
     *
     * Grouped in SQL rather than in Node: fetching every version row to fold
     * them into events would read the whole history to render twenty lines of
     * it. Every row of one publish shares its timestamp and author, so those
     * group cleanly alongside the id.
     */
    async listPublishes(
      projectId: string,
      locale: string,
      before: PublishCursor | undefined,
      limit: number,
    ): Promise<PublishEvent[]> {
      const keyset = before
        ? sql`and (created_at, publish_id) < (${before.at}, ${before.publishId})`
        : sql``

      const result = await db.execute<PublishRow>(sql`
        select publish_id,
               to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                 as published_at,
               author,
               array_agg(key order by key) as keys
          from content_versions
         where project_id = ${projectId} and locale = ${locale} ${keyset}
         group by publish_id, created_at, author
         order by created_at desc, publish_id desc
         limit ${limit}
      `)

      return result.rows.map((row) => ({
        publishId: row.publish_id,
        publishedAt: row.published_at,
        author: row.author,
        keys: row.keys,
      }))
    },
  }
}
