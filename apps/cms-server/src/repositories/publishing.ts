import { type Author, type ContentValue, documentsMatch } from '@ainam/schema'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentEntries, contentVersions } from '../db/schema'

import { createId } from '../lib/ids'

export interface StoredEntry {
  value: ContentValue
  version: number
}

export interface ValueWrite {
  projectId: string
  key: string
  locale: string
  value: ContentValue
  author: Author
  at: Date
}

/**
 * The writes that make a value live, shared by publishing and by rolling back.
 *
 * Both put a value into the published row and record what went live; a rollback
 * is a publish of an older value, not a different mechanism. Keeping the two on
 * one implementation is what stops a restore from quietly skipping the history
 * row that makes it undoable in turn.
 *
 * Every method expects a transaction: the caller holds the project's advisory
 * lock, so a publish cannot interleave with a schema push or another publish.
 */
export function createPublishingRepository(tx: Database) {
  async function findEntry(
    write: Pick<ValueWrite, 'projectId' | 'key' | 'locale'>,
    status: 'draft' | 'published',
  ): Promise<StoredEntry | undefined> {
    const [row] = await tx
      .select({ value: contentEntries.value, version: contentEntries.version })
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.projectId, write.projectId),
          eq(contentEntries.locale, write.locale),
          eq(contentEntries.key, write.key),
          eq(contentEntries.status, status),
        ),
      )
      .limit(1)
    return row ? { value: row.value ?? null, version: row.version } : undefined
  }

  async function upsertEntry(
    write: ValueWrite,
    status: 'draft' | 'published',
    version: number,
  ): Promise<void> {
    await tx
      .insert(contentEntries)
      .values({
        id: createId('entry'),
        projectId: write.projectId,
        key: write.key,
        locale: write.locale,
        status,
        value: write.value,
        version,
        updatedAt: write.at,
        updatedBy: write.author,
      })
      .onConflictDoUpdate({
        target: [
          contentEntries.projectId,
          contentEntries.key,
          contentEntries.locale,
          contentEntries.status,
        ],
        set: { value: write.value, version, updatedAt: write.at, updatedBy: write.author },
      })
  }

  return {
    findEntry,

    /**
     * Makes one value live and records the version behind it.
     *
     * Returns the new version, or undefined when the live value already says
     * this — publishing that would add a history row nobody could tell apart
     * from the one before it, and a rollback target that changes nothing.
     */
    async publishValue(write: ValueWrite, publishId: string): Promise<number | undefined> {
      const live = await findEntry(write, 'published')
      if (live && documentsMatch(live.value, write.value)) return undefined

      const version = (live?.version ?? 0) + 1
      await upsertEntry(write, 'published', version)

      await tx.insert(contentVersions).values({
        id: createId('ver'),
        projectId: write.projectId,
        key: write.key,
        locale: write.locale,
        version,
        value: write.value,
        createdAt: write.at,
        author: write.author,
        publishId,
      })

      return version
    },

    /**
     * Replaces the draft, ignoring whatever version it was at.
     *
     * Deliberately not the editor's compare-and-set write: a rollback is a
     * decision about what the site should say, and leaving the old draft in
     * place would put the reverted value back on the next unrelated publish.
     */
    async overwriteDraft(write: ValueWrite): Promise<void> {
      const draft = await findEntry(write, 'draft')
      await upsertEntry(write, 'draft', (draft?.version ?? 0) + 1)
    },
  }
}
