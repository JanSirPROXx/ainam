export { createAinamClient } from './client'
export type { AinamClient } from './client'
export { defineContentSchema } from './define'
export type { AinamClientConfig } from './config'
export { AinamError } from './errors'
export type { AinamErrorCode } from './errors'
export { isContentSnapshot } from './snapshot'
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
  RichTextValue,
  ScalarField,
  ScalarValue,
  SchemaPushRequest,
  SchemaPushResult,
  TextField,
} from '@ainam/schema/types'
