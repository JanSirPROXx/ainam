import type { ContentValue } from '@ainam/schema/types'

/**
 * Content captured at build time and shipped with the site.
 *
 * This is what keeps a customer's site up while the CMS is not: the client
 * falls back to it whenever a request fails. Generate it with `ainam pull`.
 */
export interface ContentSnapshot {
  projectId: string
  locale: string
  /** ISO timestamp of when the snapshot was generated. */
  generatedAt: string
  entries: Record<string, ContentValue>
}

/** Narrowing type guard, so a hand-written or stale snapshot fails loudly. */
export function isContentSnapshot(value: unknown): value is ContentSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ContentSnapshot>
  return (
    typeof candidate.projectId === 'string' &&
    typeof candidate.locale === 'string' &&
    typeof candidate.generatedAt === 'string' &&
    typeof candidate.entries === 'object' &&
    candidate.entries !== null
  )
}
