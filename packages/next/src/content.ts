import {
  type AinamClientConfig,
  type ContentMap,
  type ContentValue,
  createAinamClient,
} from '@ainam/core'
import { contentTag } from './tags'

export interface AinamNextConfig extends Omit<AinamClientConfig, 'fetch'> {}

export interface AinamNextContent {
  getAll(): Promise<ContentMap>
  get(key: string): Promise<ContentValue | undefined>
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
 * export const ainam = createAinamContent({
 *   apiKey: process.env.AINAM_API_KEY!,
 *   projectId: process.env.AINAM_PROJECT_ID!,
 *   locale: 'de',
 * })
 *
 * // app/page.tsx
 * export default async function Page() {
 *   const title = await ainam.get('home/hero/title')
 *   return <h1>{String(title)}</h1>
 * }
 * ```
 */
export function createAinamContent(config: AinamNextConfig): AinamNextContent {
  const locale = config.locale ?? 'en'
  const tag = contentTag(config.projectId, locale)

  const client = createAinamClient({
    ...config,
    fetch: (input, init) =>
      fetch(input, { ...init, next: { tags: [tag], revalidate: false } } as RequestInit),
  })

  return {
    tag,
    getAll: () => client.getAll(),
    get: (key) => client.get(key),
  }
}
