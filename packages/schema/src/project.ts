import { z } from 'zod'
import { fieldSchema } from './fields'
import { contentKeySchema, localeSchema } from './primitives'

/**
 * The content schema of one project: every editable key and the field that
 * describes it.
 *
 * This is authored in the website's codebase and uploaded by `ainam push` — the
 * dashboard never edits it. A key that is not in here cannot be edited, which is
 * what makes a wrong content key a build error rather than a blank section.
 */
export const contentSchemaSchema = z.record(contentKeySchema, fieldSchema)

export const schemaPushRequestSchema = z.object({
  schema: contentSchemaSchema,
  locales: z.array(localeSchema).min(1),
  defaultLocale: localeSchema,
})

/**
 * Reports what a push changed. Removed keys are surfaced separately because
 * their stored content is retained, not deleted — a key that disappears from a
 * refactor must not take a customer's copy with it.
 */
export const schemaPushResultSchema = z.object({
  added: z.array(contentKeySchema),
  updated: z.array(contentKeySchema),
  removed: z.array(contentKeySchema),
})
