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

// ---------------------------------------------------------------- api

/**
 * `content:read:draft` is separate from `content:read` on purpose: the build key
 * lives in CI and in every deploy environment a customer has, so it is the key
 * most likely to leak — and it must not be able to read unpublished content.
 */
export type ApiKeyScope = 'content:read' | 'content:read:draft' | 'schema:write'

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation_failed'
  | 'rate_limited'
  | 'internal'

export interface ApiErrorDetail {
  path: string
  message: string
}

/** The shape of every non-2xx response body. */
export interface ApiError {
  error: {
    code: ApiErrorCode
    message: string
    requestId: string
    details?: ApiErrorDetail[] | undefined
  }
}

// ---------------------------------------------------------------- editor

/**
 * Versions are per key, not per publish: two keys published together can be at
 * different versions because they were edited a different number of times. A
 * single number on the publish result would have to be one of them, and would
 * be wrong for the other.
 */
export interface ContentRevision {
  value: ContentValue
  version: number
  updatedAt: string
  updatedBy: Author
}

/** Whether a key's draft differs from what the public sees. */
export type EditorEntryState = 'unpublished' | 'published' | 'never-published'

export interface EditorEntry {
  key: ContentKey
  field: Field
  draft: ContentRevision | null
  published: ContentRevision | null
  state: EditorEntryState
}

export interface EditorView {
  locale: Locale
  entries: EditorEntry[]
  unpublishedCount: number
}

export interface SaveDraftEntry {
  key: ContentKey
  value: ContentValue
  /** What the editor had when it loaded. A moved version means someone else edited. */
  expectedVersion: number
}

export interface SaveDraftRequest {
  locale: Locale
  entries: SaveDraftEntry[]
}

export interface SaveDraftResult {
  saved: Array<{ key: ContentKey; version: number }>
}

export interface PublishRequest {
  locale: Locale
  keys?: ContentKey[] | undefined
}

/**
 * Whether the site was told to refresh.
 *
 * `skipped` is its own state rather than a flavour of `delivered`: when nothing
 * changed there is nothing to notify about, and reporting a delivery that never
 * happened is exactly the kind of claim that makes "published but the page
 * still shows the old text" impossible to debug.
 */
export type WebhookDelivery = 'delivered' | 'failed' | 'not-configured' | 'skipped'

export interface PublishResult {
  published: ContentKey[]
  publishedAt: string
  webhook: WebhookDelivery
}

// ---------------------------------------------------------------- history

/** One past published value of one key. */
export interface ContentVersion {
  version: number
  value: ContentValue
  createdAt: string
  author: Author
  /** The publish this value went live in. Shared by every key in that publish. */
  publishId: Id
}

/**
 * A page of a key's history, newest first.
 *
 * Keyset rather than offset pagination: history is append-only and read while
 * it is being written to, and an offset would silently repeat or skip a row
 * whenever a publish landed between two pages.
 */
export interface ContentVersionPage {
  key: ContentKey
  locale: Locale
  versions: ContentVersion[]
  /** Pass back as `cursor` for the next page. Null when this was the last one. */
  nextCursor: string | null
  people: AuthorNames
}

/**
 * Display names for the user ids in a page's authors.
 *
 * An `Author` carries an id rather than a name so history stays correct when
 * someone is renamed, and a page listing raw ids would be unreadable. Resolved
 * per page, including for people who have since left the organisation.
 */
export type AuthorNames = Record<Id, string>

/** One publish, as the history tab lists it. */
export interface PublishEvent {
  publishId: Id
  publishedAt: string
  author: Author
  keys: ContentKey[]
}

export interface PublishEventPage {
  locale: Locale
  publishes: PublishEvent[]
  nextCursor: string | null
  people: AuthorNames
}

export interface RestoreVersionRequest {
  locale: Locale
  key: ContentKey
  version: number
}

export interface RevertPublishRequest {
  publishId: Id
}

/**
 * What a restore or a revert put back.
 *
 * Both record a new publish rather than rewinding the version counter, so the
 * rollback is itself in the history and itself undoable.
 *
 * `skipped` names keys the operation could not reach — a key introduced by the
 * publish being reverted has no earlier state to return to, and inventing one
 * would be worse than saying so.
 */
export interface RestoreResult {
  restored: ContentKey[]
  skipped: ContentKey[]
  publishId: Id
  publishedAt: string
  webhook: WebhookDelivery
}

// ---------------------------------------------------------------- project

/** A project as the dashboard lists it. Never carries the webhook secret. */
export interface ProjectSummary {
  id: Id
  organizationId: Id
  organizationName: string
  name: string
  slug: string
  defaultLocale: Locale
  locales: Locale[]
  /** The caller's role in the owning organisation. */
  role: string
  webhookUrl: string | null
  previewUrl: string | null
}

export interface UpdateProjectRequest {
  name?: string | undefined
  /** Called after a publish so the site revalidates. An empty string clears it. */
  webhookUrl?: string | undefined
  /** Where the editor's preview link points. An empty string clears it. */
  previewUrl?: string | undefined
}

/** A short-lived signed link that puts the customer's site into draft mode. */
export interface PreviewLink {
  url: string
  expiresAt: string
}
