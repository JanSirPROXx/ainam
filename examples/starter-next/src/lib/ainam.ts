import { createAinamContent } from '@ainam/next'
import snapshot from '../../ainam-snapshot.en.json'
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
  projectId: projectId || 'unconfigured',
  baseUrl: process.env['AINAM_URL'] ?? 'http://localhost:8787',
  locale: 'en',
  snapshot,
})
