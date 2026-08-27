import { z } from 'zod'
import { apiKeyScopeSchema } from './api'
import { idSchema } from './primitives'

/**
 * Creating and listing the credentials a site reads with.
 *
 * Without this a developer cannot mint the key the SDK needs, so it sits
 * directly on the path from signing up to a working site.
 */
export const createApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(apiKeyScopeSchema).min(1),
})

export const createdApiKeySchema = z.object({
  id: idSchema,
  name: z.string(),
  scopes: z.array(apiKeyScopeSchema),
  prefix: z.string(),
  key: z.string(),
})

export const apiKeySummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  scopes: z.array(apiKeyScopeSchema),
  prefix: z.string(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  /** Set rather than deleted, so a revoked key stays auditable. */
  revokedAt: z.iso.datetime().nullable(),
})
