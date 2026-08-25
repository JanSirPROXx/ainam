import type { ContentSchema, SchemaPushResult } from '@ainam/schema'
import { canonicalize } from './canonical-json'

/**
 * Compares the pushed schema against what the project had.
 *
 * Removal is reported but never destructive: the stored content for a removed
 * key is kept. A key can disappear because a component was refactored or a
 * branch was pushed by mistake, and taking a customer's copy with it would be
 * unrecoverable.
 */
export function diffContentSchemas(
  previous: ContentSchema,
  next: ContentSchema,
): SchemaPushResult {
  const added: string[] = []
  const updated: string[] = []

  for (const [key, field] of Object.entries(next)) {
    const before = previous[key]
    if (before === undefined) added.push(key)
    else if (canonicalize(before) !== canonicalize(field)) updated.push(key)
  }

  const removed = Object.keys(previous).filter((key) => !(key in next))

  return { added: added.sort(), updated: updated.sort(), removed: removed.sort() }
}
