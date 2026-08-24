/**
 * Compile-time proof that every validator still produces the published type.
 *
 * This file exports nothing and is excluded from the bundle — it exists purely
 * so that `tsc` fails when a Zod schema and its hand-written counterpart in
 * `types.ts` drift apart. Without it, the two definitions could disagree and
 * the mismatch would only surface as a runtime bug in a customer's site.
 */
import type { z } from 'zod'
import type { contentEntrySchema, contentValueSchema, scalarValueSchema } from './content'
import type { fieldSchema, listFieldSchema, scalarFieldSchema } from './fields'
import type { contentSchemaSchema, schemaPushRequestSchema, schemaPushResultSchema } from './project'
import type * as T from './types'

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Expect<Assertion extends true> = Assertion

export type _ScalarValue = Expect<Exact<z.infer<typeof scalarValueSchema>, T.ScalarValue>>
export type _ContentValue = Expect<Exact<z.infer<typeof contentValueSchema>, T.ContentValue>>
export type _ContentEntry = Expect<Exact<z.infer<typeof contentEntrySchema>, T.ContentEntry>>
export type _ScalarField = Expect<Exact<z.infer<typeof scalarFieldSchema>, T.ScalarField>>
export type _ListField = Expect<Exact<z.infer<typeof listFieldSchema>, T.ListField>>
export type _Field = Expect<Exact<z.infer<typeof fieldSchema>, T.Field>>
export type _ContentSchema = Expect<Exact<z.infer<typeof contentSchemaSchema>, T.ContentSchema>>
export type _PushRequest = Expect<Exact<z.infer<typeof schemaPushRequestSchema>, T.SchemaPushRequest>>
export type _PushResult = Expect<Exact<z.infer<typeof schemaPushResultSchema>, T.SchemaPushResult>>
