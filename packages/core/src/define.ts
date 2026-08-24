import type { ContentSchema } from '@ainam/schema/types'

/**
 * Declares the content schema of a project.
 *
 * The schema lives in the website's codebase and is uploaded by `ainam push` —
 * it is never modelled in the dashboard. This helper only adds types: it returns
 * its argument unchanged, so the generic parameter preserves the exact keys for
 * `ainam pull` to generate accessors from.
 *
 * @example
 * ```ts
 * // ainam.config.ts
 * export default defineContentSchema({
 *   'home/hero/title': { type: 'text', label: 'Hero title', required: true },
 *   'home/hero/image': { type: 'image', label: 'Hero image', required: false, alt: true },
 * })
 * ```
 */
export function defineContentSchema<const T extends ContentSchema>(schema: T): T {
  return schema
}
