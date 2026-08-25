import {
  type AinamClientConfig,
  type ContentMap,
  createAinamClient,
} from '@ainam/core'
import { contentTag } from './tags'

export interface AinamNextConfig extends Omit<AinamClientConfig, 'fetch'> {}

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
 * @example
 * ```ts
 * // lib/ainam.ts
 * import type { AinamContent } from '../ainam.gen'
 *
 * export const ainam = createAinamContent<AinamContent>({
 *   apiKey: process.env.AINAM_API_KEY!,
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
  const locale = config.locale ?? 'en'
  const tag = contentTag(config.projectId, locale)

  const client = createAinamClient<T>({
    ...config,
    fetch: (input, init) =>
      fetch(input, { ...init, next: { tags: [tag], revalidate: false } } as RequestInit),
  })

  return {
    tag,
    getAll: () => client.getAll(),
    get: (key) => client.get(key),
    getOptional: (key) => client.getOptional(key),
  }
}
