import { z } from 'zod'
import { contentValueSchema, authorSchema } from './content'
import { fieldSchema } from './fields'
import { contentKeySchema, localeSchema } from './primitives'

const revisionSchema = z.object({
  value: contentValueSchema,
  version: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
  updatedBy: authorSchema,
})

/**
 * One editable key, as the dashboard needs it.
 *
 * Draft and published are both present so the editor can show what would change
 * on publish. `state` is derived here rather than in the client, so two
 * surfaces cannot disagree about whether something counts as changed.
 */
export const editorEntrySchema = z.object({
  key: contentKeySchema,
  field: fieldSchema,
  draft: revisionSchema.nullable(),
  published: revisionSchema.nullable(),
  state: z.enum(['unpublished', 'published', 'never-published']),
})

export const editorViewSchema = z.object({
  locale: localeSchema,
  entries: z.array(editorEntrySchema),
  unpublishedCount: z.number().int().nonnegative(),
})

/**
 * A batch of draft edits.
 *
 * `expectedVersion` is what the editor had when it loaded the value. If the
 * stored version moved on, someone else edited the same key and the write is
 * refused rather than silently overwriting them.
 */
export const saveDraftRequestSchema = z.object({
  locale: localeSchema,
  entries: z
    .array(
      z.object({
        key: contentKeySchema,
        value: contentValueSchema,
        expectedVersion: z.number().int().nonnegative(),
      }),
    )
    .min(1),
})

export const saveDraftResultSchema = z.object({
  saved: z.array(z.object({ key: contentKeySchema, version: z.number().int().nonnegative() })),
})

export const publishRequestSchema = z.object({
  locale: localeSchema,
  /** Omit to publish every unpublished key in the locale. */
  keys: z.array(contentKeySchema).optional(),
})

export const publishResultSchema = z.object({
  published: z.array(contentKeySchema),
  publishedAt: z.iso.datetime(),
  /**
   * Whether the site was told to refresh. Reported rather than only logged:
   * "published but the page still shows the old text" is the single most
   * confusing thing that can happen to a customer, and the answer is here.
   */
  webhook: z.enum(['delivered', 'failed', 'not-configured']),
})
