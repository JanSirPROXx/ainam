/**
 * The AINAM domain model, written as plain TypeScript.
 *
 * These types — not the Zod inferences — are what the SDK publishes. Deriving
 * the public types from Zod would drag its internal generics into every
 * consumer's `.d.ts` (measured: 100 kB for a 5 kB client), which slows down
 * their editor and their build for no benefit.
 *
 * `schema-parity.ts` fails the typecheck if a validator ever stops matching the
 * type it is supposed to enforce, so the two cannot drift apart silently.
 */

/** A BCP-47 language tag — `de`, `de-CH`, `en`. */
export type Locale = string

/** A slash-separated content key — `home/hero/title`. */
export type ContentKey = string

/** Opaque server-issued identifier. */
export type Id = string

// ---------------------------------------------------------------- values

/** A TipTap document. The node tree is opaque here; TipTap owns that shape. */
export interface RichTextValue {
  type: 'doc'
  content: unknown[]
}

export interface ImageValue {
  assetId: Id
  alt: string
}

export type ScalarValue = string | number | boolean | null | RichTextValue | ImageValue

export type ContentValue = ScalarValue | Array<Record<string, ScalarValue>>

export type ContentStatus = 'draft' | 'published'

/** Who last changed an entry. An agent edit is a first-class case, not a user. */
export type Author = { kind: 'user'; id: Id } | { kind: 'agent'; name: string }

export interface ContentEntry {
  key: ContentKey
  locale: Locale
  status: ContentStatus
  value: ContentValue
  version: number
  updatedAt: string
  updatedBy: Author
}

// ---------------------------------------------------------------- fields

export interface FieldBase {
  label: string
  description?: string | undefined
  required: boolean
}

/**
 * Every field kind except `image` carries a mandatory default, seeded by
 * `ainam push` into the draft and published rows. That is what stops a fresh
 * integration from rendering a blank page, and what makes the generated
 * accessors safe to type as non-nullable.
 */

export interface TextField extends FieldBase {
  type: 'text'
  default: string
  multiline: boolean
  maxLength?: number | undefined
}

export interface RichTextField extends FieldBase {
  type: 'richText'
  /** Seeded as a single paragraph; authoring a node tree in a config file is unreadable. */
  default: string
}

/** The one kind without a default — an unuploaded file has no meaningful value. */
export interface ImageField extends FieldBase {
  type: 'image'
  alt: boolean
}

export interface BooleanField extends FieldBase {
  type: 'boolean'
  default: boolean
}

export interface NumberField extends FieldBase {
  type: 'number'
  default: number
  min?: number | undefined
  max?: number | undefined
}

export type ScalarField = TextField | RichTextField | ImageField | BooleanField | NumberField

/** A repeatable group of scalar fields — a testimonial list, a pricing table. */
export interface ListField extends FieldBase {
  type: 'list'
  fields: Record<string, ScalarField>
  default: Array<Record<string, unknown>>
  maxItems?: number | undefined
}

export type Field = ScalarField | ListField

// ---------------------------------------------------------------- project

export type ContentSchema = Record<ContentKey, Field>

export interface SchemaPushRequest {
  schema: ContentSchema
  locales: Locale[]
  defaultLocale: Locale
}

export interface SchemaPushResult {
  added: ContentKey[]
  updated: ContentKey[]
  removed: ContentKey[]
}
