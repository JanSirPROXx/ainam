import { z } from 'zod'
import { authorSchema, contentValueSchema } from './content'
import { contentKeySchema, idSchema, localeSchema } from './primitives'

export const contentVersionSchema = z.object({
  version: z.number().int().positive(),
  value: contentValueSchema,
  createdAt: z.iso.datetime(),
  author: authorSchema,
  publishId: idSchema,
})

/**
 * A page of history, newest first.
 *
 * `nextCursor` is opaque to the client on purpose: it encodes a position, not a
 * page number, so a publish landing between two requests cannot make a page
 * repeat or skip a row the way an offset would.
 */
const authorNamesSchema = z.record(idSchema, z.string())

export const contentVersionPageSchema = z.object({
  key: contentKeySchema,
  locale: localeSchema,
  versions: z.array(contentVersionSchema),
  nextCursor: z.string().nullable(),
  people: authorNamesSchema,
})

export const publishEventSchema = z.object({
  publishId: idSchema,
  publishedAt: z.iso.datetime(),
  author: authorSchema,
  keys: z.array(contentKeySchema),
})

export const publishEventPageSchema = z.object({
  locale: localeSchema,
  publishes: z.array(publishEventSchema),
  nextCursor: z.string().nullable(),
  people: authorNamesSchema,
})

export const restoreVersionRequestSchema = z.object({
  locale: localeSchema,
  key: contentKeySchema,
  version: z.number().int().positive(),
})

export const revertPublishRequestSchema = z.object({
  publishId: idSchema,
})

export const restoreResultSchema = z.object({
  restored: z.array(contentKeySchema),
  /** Keys with no earlier state to return to. Named rather than silently dropped. */
  skipped: z.array(contentKeySchema),
  publishId: idSchema,
  publishedAt: z.iso.datetime(),
  webhook: z.enum(['delivered', 'failed', 'not-configured', 'skipped']),
})

/** Bounded so one request cannot ask the server to materialise a whole history. */
export const historyQuerySchema = z.object({
  locale: localeSchema.optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
