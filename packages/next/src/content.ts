import { type AinamClient, type AinamClientConfig, type ContentMap, createAinamClient } from '@ainam/core'
import { draftMode } from 'next/headers'
import { contentTag } from './tags'

export interface AinamNextConfig extends Omit<AinamClientConfig, 'fetch' | 'preview'> {
  /**
   * A key carrying `content:read:draft`, used only while Next's draft mode is
   * on. Leave it unset and preview links fall back to published content.
   *
   * Deliberately a second key: the one above lives in CI and in every deploy
   * environment, so it is the one most likely to leak, and it must not be able
   * to read content nobody has published.
   */
  previewApiKey?: string
}

export interface AinamNextContent<T extends ContentMap = ContentMap> {
  getAll(): Promise<T>
  /** Throws if the key is not published. See `@ainam/core` for why that is safe. */
  get<K extends keyof T & string>(key: K): Promise<T[K]>
  /** The same read, for a key that may legitimately be absent. */
  getOptional<K extends keyof T & string>(key: K): Promise<T[K] | undefined>
  /** The cache tag these reads register under. Pass it to `revalidateTag`. */
  tag: string
}

/**
 * Creates a content accessor backed by the Next.js data cache.
 *
 * Reads are cached indefinitely and invalidated by the revalidation webhook
 * rather than by a TTL — content changes when someone publishes, not on a
 * timer, and polling the CMS on every request would make our uptime the
 * customer's uptime.
 *
 * While draft mode is on, reads come from the preview endpoint instead, so the
 * same page component renders unpublished work with no branching in the page.
 *
 * @example
 * ```ts
 * // lib/ainam.ts
 * import type { AinamContent } from '../ainam.gen'
 *
 * export const ainam = createAinamContent<AinamContent>({
 *   apiKey: process.env.AINAM_API_KEY!,
 *   previewApiKey: process.env.AINAM_PREVIEW_API_KEY,
 *   projectId: process.env.AINAM_PROJECT_ID!,
 *   locale: 'de',
 * })
 *
 * // app/page.tsx
 * export default async function Page() {
 *   const title = await ainam.get('home/hero/title')
 *   return <h1>{title}</h1>
 * }
 * ```
 */
export function createAinamContent<T extends ContentMap = ContentMap>(
  config: AinamNextConfig,
): AinamNextContent<T> {
  const { previewApiKey, ...clientConfig } = config
  const locale = config.locale ?? 'en'
  const tag = contentTag(config.projectId, locale)

  const published = createAinamClient<T>({
    ...clientConfig,
    fetch: (input, init) =>
      fetch(input, { ...init, next: { tags: [tag], revalidate: false } } as RequestInit),
  })

  const preview = createPreviewClient<T>(clientConfig, previewApiKey)

  return {
    tag,
    getAll: async () => (await activeClient(published, preview)).getAll(),
    get: async (key) => (await activeClient(published, preview)).get(key),
    getOptional: async (key) => (await activeClient(published, preview)).getOptional(key),
  }
}

function createPreviewClient<T extends ContentMap>(
  config: Omit<AinamClientConfig, 'fetch' | 'preview'>,
  previewApiKey: string | undefined,
): AinamClient<T> | undefined {
  if (!previewApiKey) return undefined

  // No snapshot and no cache, unlike the published client. A draft changes on
  // every save, and quietly serving the build-time snapshot instead would show
  // an editor published copy while telling them they are looking at their draft.
  const { snapshot: _snapshot, ...withoutSnapshot } = config
  return createAinamClient<T>({
    ...withoutSnapshot,
    apiKey: previewApiKey,
    preview: true,
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' } as RequestInit),
  })
}

/**
 * Picks the reader for this request.
 *
 * `draftMode()` throws outside a request — during static generation, or in a
 * module evaluated at build time — and published content is the correct answer
 * in both cases, so the throw is a signal rather than a failure.
 */
async function activeClient<T extends ContentMap>(
  published: AinamClient<T>,
  preview: AinamClient<T> | undefined,
): Promise<AinamClient<T>> {
  if (!preview) return published
  try {
    return (await draftMode()).isEnabled ? preview : published
  } catch {
    return published
  }
}
