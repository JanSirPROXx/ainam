import type { ContentValue } from '@ainam/schema/types'
import { type AinamClientConfig, resolveConfig } from './config'
import { type ContentMap, fetchContent } from './transport'

export interface AinamClient {
  /** Every published entry for the configured locale, keyed by content key. */
  getAll(): Promise<ContentMap>
  /** One entry, or `undefined` if the key is not published in this locale. */
  get(key: string): Promise<ContentValue | undefined>
}

/**
 * Creates a client for the AINAM content API.
 *
 * The client deduplicates concurrent reads but does not cache across calls —
 * caching and revalidation belong to the framework adapter, which knows when
 * content actually changed. Use `@ainam/next` rather than calling this on every
 * request.
 *
 * @example
 * ```ts
 * const ainam = createAinamClient({
 *   apiKey: process.env.AINAM_API_KEY!,
 *   projectId: 'proj_8f2a',
 *   locale: 'de',
 *   snapshot,
 * })
 *
 * const title = await ainam.get('home/hero/title')
 * ```
 */
export function createAinamClient(config: AinamClientConfig): AinamClient {
  const resolved = resolveConfig(config)
  let inFlight: Promise<ContentMap> | undefined

  async function load(): Promise<ContentMap> {
    try {
      return await fetchContent(resolved)
    } catch (error) {
      if (!resolved.snapshot) throw error
      // Falling back keeps the site rendering, but a silent fallback would hide
      // an outage until the content went stale enough for someone to notice.
      console.warn(
        `[ainam] Content request failed, serving the build-time snapshot from ${resolved.snapshot.generatedAt}. ` +
          `Cause: ${error instanceof Error ? error.message : String(error)}`,
      )
      return resolved.snapshot.entries
    }
  }

  function getAll(): Promise<ContentMap> {
    inFlight ??= load().finally(() => {
      inFlight = undefined
    })
    return inFlight
  }

  return {
    getAll,
    async get(key) {
      return (await getAll())[key]
    },
  }
}
