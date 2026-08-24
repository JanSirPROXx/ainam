import { z } from 'zod'
import { contentKeySchema, idSchema, localeSchema } from './primitives'

/**
 * A TipTap document, stored as JSON and never as HTML.
 *
 * The node tree is not validated field by field: TipTap owns that shape and
 * mirroring it here would break every time an extension is added. Storing JSON
 * rather than HTML is what matters — it keeps rendering safe and lets a
 * consumer map nodes onto their own components.
 */
export const richTextValueSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.unknown()).default([]),
})

export const imageValueSchema = z.object({
  assetId: idSchema,
  alt: z.string().max(500).default(''),
})

export const scalarValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  richTextValueSchema,
  imageValueSchema,
])

export const contentValueSchema = z.union([
  scalarValueSchema,
  z.array(z.record(z.string(), scalarValueSchema)),
])

export const contentStatusSchema = z.enum(['draft', 'published'])

/**
 * Who last changed an entry.
 *
 * An agent edit is a first-class case, not a user with a special name: the
 * dashboard renders `agent` where a human name would sit, and attributing an
 * automated change to a person would be misleading in the version history.
 */
export const authorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), id: idSchema }),
  z.object({ kind: z.literal('agent'), name: z.string().min(1).max(120) }),
])

export const contentEntrySchema = z.object({
  key: contentKeySchema,
  locale: localeSchema,
  status: contentStatusSchema,
  value: contentValueSchema,
  version: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
  updatedBy: authorSchema,
})
