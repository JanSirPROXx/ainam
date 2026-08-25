import type { Author, ContentRevision, EditorEntry, EditorView } from '@ainam/schema'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentEntries, contentSchemas } from '../db/schema'

type Row = typeof contentEntries.$inferSelect

function toRevision(row: Row | undefined): ContentRevision | null {
  if (!row) return null
  return {
    value: row.value ?? null,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  }
}

/**
 * The schema's keys, in the order they were declared.
 *
 * A key missing from the recorded order is appended rather than dropped: the
 * order is written by `ainam push`, and a project pushed before the column
 * existed has none at all. Losing a field from the editor would be far worse
 * than showing it last.
 */
export function orderedKeys(schema: Record<string, unknown>, declared: string[]): string[] {
  const known = new Set(declared)
  const rest = Object.keys(schema).filter((key) => !known.has(key))
  return [...declared.filter((key) => key in schema), ...rest]
}

/** Whether the draft says something different from what the public sees. */
function stateOf(draft: ContentRevision | null, published: ContentRevision | null) {
  if (!published) return 'never-published' as const
  if (!draft) return 'published' as const
  return JSON.stringify(draft.value) === JSON.stringify(published.value)
    ? ('published' as const)
    : ('unpublished' as const)
}

export function createEditorRepository(db: Database) {
  return {
    /**
     * Everything the editor needs for one locale, in one round trip.
     *
     * Driven by the schema rather than by the content rows, so a key with no row
     * yet still appears — and ordered by the order the developer declared, which
     * is recorded at push time because JSONB does not preserve it.
     */
    async loadView(projectId: string, locale: string): Promise<EditorView | undefined> {
      const [schemaRow] = await db
        .select({ schema: contentSchemas.schema, keyOrder: contentSchemas.keyOrder })
        .from(contentSchemas)
        .where(eq(contentSchemas.projectId, projectId))
        .limit(1)
      if (!schemaRow) return undefined

      const rows = await db
        .select()
        .from(contentEntries)
        .where(and(eq(contentEntries.projectId, projectId), eq(contentEntries.locale, locale)))

      const drafts = new Map(rows.filter((r) => r.status === 'draft').map((r) => [r.key, r]))
      const published = new Map(rows.filter((r) => r.status === 'published').map((r) => [r.key, r]))

      const entries: EditorEntry[] = []
      for (const key of orderedKeys(schemaRow.schema, schemaRow.keyOrder)) {
        const field = schemaRow.schema[key]
        if (!field) continue
        const draft = toRevision(drafts.get(key))
        const live = toRevision(published.get(key))
        entries.push({ key, field, draft, published: live, state: stateOf(draft, live) })
      }

      return {
        locale,
        entries,
        unpublishedCount: entries.filter((e) => e.state !== 'published').length,
      }
    },

    /**
     * Writes one draft value if nobody else has moved it.
     *
     * The version check is part of the UPDATE rather than a read followed by a
     * write, so two editors saving the same field at the same moment cannot both
     * believe they won. Returns the new version, or undefined when the row moved.
     */
    async saveDraftEntry(
      tx: Database,
      projectId: string,
      locale: string,
      key: string,
      value: Row['value'],
      expectedVersion: number,
      author: Author,
    ): Promise<number | undefined> {
      const [row] = await tx
        .update(contentEntries)
        .set({ value, version: expectedVersion + 1, updatedAt: new Date(), updatedBy: author })
        .where(
          and(
            eq(contentEntries.projectId, projectId),
            eq(contentEntries.locale, locale),
            eq(contentEntries.key, key),
            eq(contentEntries.status, 'draft'),
            eq(contentEntries.version, expectedVersion),
          ),
        )
        .returning({ version: contentEntries.version })
      return row?.version
    },
  }
}
