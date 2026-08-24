import { z } from 'zod'

/**
 * Every error the API returns, in one vocabulary.
 *
 * Codes are stable and machine-readable; messages are written for a person
 * debugging a self-hosted instance who cannot read our logs. The dashboard
 * branches on `code`, never on `message`.
 */
export const apiErrorCodeSchema = z.enum([
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'validation_failed',
  'rate_limited',
  'internal',
])

/**
 * What a project API key is allowed to do.
 *
 * A read key ends up in a customer's deployment environment and can leak; it
 * must not be able to rewrite the content schema. Push therefore needs its own
 * scope, held only by a key the developer keeps.
 */
export const apiKeyScopeSchema = z.enum(['content:read', 'schema:write'])

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    /** Echoed in the `x-request-id` header. Quote it in a bug report. */
    requestId: z.string(),
    /** Field-level problems, present only for `validation_failed`. */
    details: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional(),
  }),
})
