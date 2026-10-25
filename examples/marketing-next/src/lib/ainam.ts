import { contentSnapshot, createAinamContent } from '@ainam/next'
import snapshotDe from '../../ainam-snapshot.de.json'
import snapshotEn from '../../ainam-snapshot.en.json'
import type { AinamContent } from '../../ainam.gen'
import type { Locale } from './i18n'

const apiKey = process.env['AINAM_API_KEY'] ?? ''
const projectId = process.env['AINAM_PROJECT_ID'] ?? ''

/**
 * Whether this site is reading from a CMS at all.
 *
 * Unconfigured, it renders from the snapshots committed beside this file — the
 * same path a configured site takes when AINAM is unreachable. Our own site
 * therefore exercises the outage fallback on every clone, rather than only
 * during an outage nobody rehearsed.
 */
export const isConfigured = apiKey !== '' && projectId !== ''

/** One snapshot per language: a fallback in the wrong one would be worse than none. */
const SNAPSHOTS: Record<Locale, ReturnType<typeof contentSnapshot>> = {
  en: contentSnapshot(snapshotEn),
  de: contentSnapshot(snapshotDe),
}

function createClient(locale: Locale) {
  return createAinamContent<AinamContent>({
    apiKey: apiKey || 'unconfigured',
    previewApiKey: process.env['AINAM_PREVIEW_API_KEY'] ?? '',
    projectId: projectId || 'unconfigured',
    // `||`, not `??`: Compose and most hosts hand an unset variable over as an
    // empty string, which `??` would keep and the client would refuse.
    baseUrl: process.env['AINAM_URL'] || 'http://localhost:8787',
    locale,
    snapshot: SNAPSHOTS[locale],
  })
}

const clients = new Map<Locale, ReturnType<typeof createClient>>()

/** A client per language, made once: each reads, caches and is purged under its own tag. */
export function ainamFor(locale: Locale) {
  const existing = clients.get(locale)
  if (existing) return existing
  const created = createClient(locale)
  clients.set(locale, created)
  return created
}
