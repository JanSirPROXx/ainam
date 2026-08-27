import type { ContentValue, EditorEntry, EditorView } from '@ainam/schema'
import { documentsMatch } from '@ainam/schema'

export type Draft = Record<string, ContentValue>

/** What the editor starts with: the draft value of every key in the schema. */
export function initialDraft(view: EditorView): Draft {
  return Object.fromEntries(view.entries.map((entry) => [entry.key, entry.draft?.value ?? null]))
}

/**
 * The entries whose local value differs from what was last saved.
 *
 * Compared with `documentsMatch`, not `JSON.stringify`: the saved value comes
 * back through a JSONB column that normalises object key order at every depth,
 * so TipTap's `{type,text,marks}` returns as `{text,type,marks}`. Comparing the
 * raw strings left every rich-text edit permanently unsaved — and because
 * Publish is disabled while anything is unsaved, the edit could never go live.
 */
export function unsavedEntries(view: EditorView, draft: Draft): EditorEntry[] {
  return view.entries.filter(
    (entry) => !documentsMatch(draft[entry.key] ?? null, entry.draft?.value ?? null),
  )
}
