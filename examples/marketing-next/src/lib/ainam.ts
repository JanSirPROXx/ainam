import { contentSnapshot, createAinamContent } from '@ainam/next'
import snapshotFile from '../../ainam-snapshot.en.json'
import type { AinamContent } from '../../ainam.gen'

const apiKey = process.env['AINAM_API_KEY'] ?? ''
const projectId = process.env['AINAM_PROJECT_ID'] ?? ''

/**
 * Whether this site is reading from a CMS at all.
 *
 * Unconfigured, it renders from the snapshot committed beside this file — the
 * same path a configured site takes when AINAM is unreachable. Our own site
 * therefore exercises the outage fallback on every clone, rather than only
 * during an outage nobody rehearsed.
 */
export const isConfigured = apiKey !== '' && projectId !== ''

export const ainam = createAinamContent<AinamContent>({
  apiKey: apiKey || 'unconfigured',
  previewApiKey: process.env['AINAM_PREVIEW_API_KEY'] ?? '',
  projectId: projectId || 'unconfigured',
  baseUrl: process.env['AINAM_URL'] ?? 'http://localhost:8787',
  locale: 'en',
  snapshot: contentSnapshot(snapshotFile),
})
