import { randomBytes } from 'node:crypto'

/**
 * Generates a prefixed, sortable-enough identifier.
 *
 * Prefixed rather than a bare UUID so an id is self-describing in a log line,
 * an error message or a support ticket — `proj_` and `key_` tell you what you
 * are looking at without a schema lookup.
 */
export function createId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('base64url')}`
}
