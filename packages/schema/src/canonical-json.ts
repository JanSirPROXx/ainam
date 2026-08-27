/**
 * Serialises a value with object keys in a stable order.
 *
 * Everything compared here has been through a JSONB column, and JSONB does not
 * preserve key order — it normalises, at every level of nesting. Comparing raw
 * `JSON.stringify` output therefore reports unchanged documents as different.
 *
 * Shared by both apps because both got this wrong independently: the server
 * reported every key as changed on every schema push, and the dashboard's
 * unsaved-changes check never cleared after saving rich text, which left
 * Publish disabled and the edit unpublishable. Order-insensitive comparison is
 * not an optimisation here; it is the difference between a correct answer and a
 * wrong one.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
  return `{${entries.join(',')}}`
}

/** Whether two stored documents say the same thing. */
export function documentsMatch(a: unknown, b: unknown): boolean {
  return canonicalize(a) === canonicalize(b)
}
