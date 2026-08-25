import type { ContentValue } from '@ainam/schema/types'
import { type AinamClientConfig, resolveConfig } from './config'
import { AinamError } from './errors'
import { type ContentMap, fetchContent } from './transport'

export interface AinamClient<T extends ContentMap = ContentMap> {
  /** Every published entry for the configured locale, keyed by content key. */
  getAll(): Promise<T>
  /**
   * One entry. Throws `AinamError` with code `not_found` if the key is not
   * published — which, for a key that is in the schema, means a bug on our side
   * rather than a case the caller should have to handle on every read.
   */
  get<K extends keyof T & string>(key: K): Promise<T[K]>
  /** The same read, for a key that may legitimately be absent. */
  getOptional<K extends keyof T & string>(key: K): Promise<T[K] | undefined>
}

/**
 * Creates a client for the AINAM content API.
 *
 * Pass the generated content map as the type argument and `get` returns the
 * exact type of each key, so a wrong key is a compile error rather than a blank
 * section. Run `ainam pull` to generate it.
 *
 * `get` throwing rather than returning `undefined` is only safe because
 * `ainam push` seeds a value for every key in the schema. If that ever stops
 * being true, this contract has to change with it.
 *
 * The client deduplicates concurrent reads but does not cache across calls —
 * caching and revalidation belong to the framework adapter, which knows when
 * content actually changed. Use `@ainam/next` rather than calling this on every
 * request.
 *
 * @example
 * ```ts
 * import type { AinamContent } from './ainam.gen'
 *
 * const ainam = createAinamClient<AinamContent>({
 *   apiKey: process.env.AINAM_API_KEY!,
 *   projectId: 'proj_8f2a',
 *   locale: 'de',
 *   snapshot,
 * })
 *
 * const title = await ainam.get('home/hero/title') // string, not unknown
 * ```
 */
export function createAinamClient<T extends ContentMap = ContentMap>(
  config: AinamClientConfig,
): AinamClient<T> {
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

  function getAll(): Promise<T> {
    inFlight ??= load().finally(() => {
      inFlight = undefined
    })
    return inFlight as Promise<T>
  }

  async function getOptional<K extends keyof T & string>(key: K): Promise<T[K] | undefined> {
    return (await getAll())[key]
  }

  return {
    getAll,
    getOptional,
    async get<K extends keyof T & string>(key: K): Promise<T[K]> {
      const value: ContentValue | undefined = await getOptional(key)
      if (value === undefined) {
        throw new AinamError(
          'not_found',
          `No published content for "${key}" in locale "${resolved.locale}". ` +
            `Run "ainam push" if the key is new, or use getOptional() if it may be absent.`,
        )
      }
      return value as T[K]
    },
  }
}
