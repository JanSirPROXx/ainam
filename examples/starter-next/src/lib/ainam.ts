import { contentSnapshot, createAinamContent } from '@ainam/next'
import snapshotFile from '../../ainam-snapshot.en.json'
import type { AinamContent } from '../../ainam.gen'

const apiKey = process.env['AINAM_API_KEY'] ?? ''
const projectId = process.env['AINAM_PROJECT_ID'] ?? ''

/**
 * Whether this site is reading from a CMS at all.
 *
 * An unconfigured checkout still renders, from the committed snapshot. That is
 * the same path a configured site takes when AINAM is unreachable, so the
 * fallback is exercised by simply cloning the template rather than only in an
 * outage nobody tests for.
 */
export const isConfigured = apiKey !== '' && projectId !== ''

export const ainam = createAinamContent<AinamContent>({
  apiKey: apiKey || 'unconfigured',
  // A second key, carrying content:read:draft. The one above is in every deploy
  // environment and in CI, so it is the one most likely to leak — and drafts
  // must not be readable with it.
  previewApiKey: process.env['AINAM_PREVIEW_API_KEY'] ?? '',
  projectId: projectId || 'unconfigured',
  baseUrl: process.env['AINAM_URL'] ?? 'http://localhost:8787',
  locale: 'en',
  // Narrowed rather than cast: TypeScript widens the string literals in an
  // imported .json, and this checks the shape while restoring the type.
  snapshot: contentSnapshot(snapshotFile),
})
