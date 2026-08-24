import { z } from 'zod'

/**
 * Field kinds an editor can be rendered for.
 *
 * The set is deliberately small: every kind added here has to be implemented in
 * the dashboard editor, validated on the server and typed in the SDK, so a kind
 * that cannot yet be edited must not exist in the schema.
 *
 * Every kind except `image` carries a mandatory `default`. That is what makes
 * the first integration render real copy instead of a blank page: `ainam push`
 * seeds the default into both the draft and the published row, so a key always
 * has a value and `get()` never returns undefined. Images are the exception —
 * there is no meaningful default for a file that has not been uploaded, so image
 * values are nullable and a site must handle that.
 */
const baseField = z.object({
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  required: z.boolean().default(false),
})

const textField = baseField.extend({
  type: z.literal('text'),
  default: z.string(),
  multiline: z.boolean().default(false),
  maxLength: z.number().int().positive().optional(),
})

const richTextField = baseField.extend({
  type: z.literal('richText'),
  // A plain string, not a TipTap document. Authoring a node tree by hand in a
  // config file is unreadable, so `ainam push` seeds this as a single paragraph.
  default: z.string(),
})

const imageField = baseField.extend({
  type: z.literal('image'),
  alt: z.boolean().default(true),
})

const booleanField = baseField.extend({
  type: z.literal('boolean'),
  default: z.boolean(),
})

const numberField = baseField.extend({
  type: z.literal('number'),
  default: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
})

/** A field holding a single value. */
export const scalarFieldSchema = z.discriminatedUnion('type', [
  textField,
  richTextField,
  imageField,
  booleanField,
  numberField,
])

/**
 * A repeatable group of scalar fields — a testimonial list, a pricing table.
 *
 * Items are intentionally limited to scalar fields rather than arbitrary
 * nesting: a recursive field type would make both the editor UI and the
 * generated TypeScript types significantly harder, for a case the MVP does not
 * need. Revisit only with a concrete requirement.
 */
export const listFieldSchema = baseField.extend({
  type: z.literal('list'),
  fields: z.record(z.string(), scalarFieldSchema),
  default: z.array(z.record(z.string(), z.unknown())),
  maxItems: z.number().int().positive().optional(),
})

export const fieldSchema = z.union([scalarFieldSchema, listFieldSchema])
