import type { Author, SaveDraftRequest, SaveDraftResult } from '@ainam/schema'
import type { Database } from '../db/client'
import { HttpError } from '../http/errors'
import { createEditorRepository } from '../repositories/editor'
import { findSchemaMismatches } from './schema-fit'

/**
 * Saves a batch of draft edits, or none of them.
 *
 * All-or-nothing on purpose: an editor who changed five fields and gets three
 * saved has no clear state to recover from, and no way to know which three
 * without re-reading everything. A conflict rolls the whole batch back and names
 * the keys that moved.
 */
export async function saveDraft(
  db: Database,
  projectId: string,
  request: SaveDraftRequest,
  author: Author,
): Promise<SaveDraftResult> {
  const editor = createEditorRepository(db)

  return db.transaction(async (tx) => {
    // Checked here rather than trusted: `contentValueSchema` proves the body is
    // *a* content value, not that it is one this field accepts. Without this a
    // number lands in a text field and the site's generated types are a lie.
    const mismatches = await findSchemaMismatches(tx as unknown as Database, projectId, request.entries)
    if (mismatches.length > 0) {
      throw new HttpError(
        422,
        'validation_failed',
        `${mismatches.length === 1 ? 'One value does' : `${mismatches.length} values do`} not fit ` +
          'the field they were sent for.',
        mismatches.map(({ key, problem }) => ({ path: key, message: problem })),
      )
    }

    const saved: SaveDraftResult['saved'] = []
    const conflicts: string[] = []

    for (const entry of request.entries) {
      const version = await editor.saveDraftEntry(
        tx as unknown as Database,
        projectId,
        request.locale,
        entry.key,
        entry.value,
        entry.expectedVersion,
        author,
      )
      if (version === undefined) conflicts.push(entry.key)
      else saved.push({ key: entry.key, version })
    }

    if (conflicts.length > 0) {
      // Thrown inside the transaction, so nothing is written.
      throw new HttpError(
        409,
        'conflict',
        `Someone else changed ${conflicts.join(', ')} while you were editing. Reload to see their version.`,
        conflicts.map((key) => ({ path: key, message: 'Changed by someone else' })),
      )
    }

    return { saved }
  })
}
