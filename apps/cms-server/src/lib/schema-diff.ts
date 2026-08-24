import type { ContentSchema, SchemaPushResult } from '@ainam/schema'

/**
 * Serialises a value with object keys in a stable order.
 *
 * The stored schema has been through a JSONB column, and JSONB does not
 * preserve key order — it normalises. Comparing raw `JSON.stringify` output
 * therefore reports every existing key as changed on every push, which makes
 * the whole diff useless. Order-insensitive comparison is not an optimisation
 * here; it is the difference between a correct answer and a wrong one.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`)
  return `{${entries.join(',')}}`
}

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
