export { createAinamClient } from './client'
export type { AinamClient } from './client'
export { defineContentSchema } from './define'
export { ainamImageProps } from './image'
export type { AinamImageProps } from './image'
export { renderRichTextToHtml } from './rich-text'

// Re-exported so `@ainam/next` — and anyone rendering rich text themselves —
// reaches the allowlist without depending on the workspace-internal schema
// package, which is never published.
export {
  RICH_TEXT_HEADING_LEVELS,
  RICH_TEXT_MARKS,
  RICH_TEXT_NODES,
  isSafeLinkHref,
  validateRichTextDoc,
} from '@ainam/schema/rich-text'
export type { RichTextMarkType, RichTextNodeType } from '@ainam/schema/rich-text'
export type { AinamClientConfig } from './config'
export { AinamError } from './errors'
export type { AinamErrorCode } from './errors'
export { contentSnapshot, isContentSnapshot } from './snapshot'
export { previewSignaturePayload } from './preview'
export { signWebhookBody } from './webhook'
export type { ContentSnapshot } from './snapshot'
export type { ContentMap } from './transport'

// Re-exported so consumers have one import source, and so published packages
// never need a dependency on the workspace-internal schema package.
export type {
  Author,
  ContentEntry,
  ContentKey,
  ContentSchema,
  ContentStatus,
  ContentValue,
  Field,
  Id,
  ImageValue,
  ListField,
  Locale,
  NumberField,
  ImageVariant,
  ResolvedImage,
  RichTextValue,
  ScalarField,
  ScalarValue,
  SchemaPushRequest,
  SchemaPushResult,
  TextField,
} from '@ainam/schema/types'
