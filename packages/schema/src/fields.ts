import { z } from 'zod'

/**
 * Field kinds an editor can be rendered for.
 *
 * The set is deliberately small: every kind added here has to be implemented in
 * the dashboard editor, validated on the server and typed in the SDK, so a kind
 * that cannot yet be edited must not exist in the schema.
 */
const baseField = z.object({
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  required: z.boolean().default(false),
})

const textField = baseField.extend({
  type: z.literal('text'),
  multiline: z.boolean().default(false),
  maxLength: z.number().int().positive().optional(),
})

const richTextField = baseField.extend({
  type: z.literal('richText'),
})

const imageField = baseField.extend({
  type: z.literal('image'),
  alt: z.boolean().default(true),
})

const booleanField = baseField.extend({
  type: z.literal('boolean'),
})

const numberField = baseField.extend({
  type: z.literal('number'),
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
  maxItems: z.number().int().positive().optional(),
})

export const fieldSchema = z.union([scalarFieldSchema, listFieldSchema])
