import type { ApiError, ApiErrorCode, ApiErrorDetail } from '@ainam/schema'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** Thrown by services and routes; the error handler turns it into the envelope. */
export class HttpError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: ApiErrorCode
  readonly details: ApiErrorDetail[] | undefined

  constructor(
    status: ContentfulStatusCode,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetail[],
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function buildApiError(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: ApiErrorDetail[],
): ApiError {
  return { error: { code, message, requestId, ...(details ? { details } : {}) } }
}

/**
 * Turns anything thrown into one envelope shape.
 *
 * An unexpected error never reaches the client verbatim: a stack trace or a
 * database message can name tables and columns. The request id is the bridge —
 * it is logged next to the real cause and returned to the caller, so a
 * self-hoster can find the line in their own logs.
 */
export function handleError(error: unknown, c: Context): Response {
  const requestId = c.get('requestId') ?? 'unknown'

  if (error instanceof HttpError) {
    return c.json(buildApiError(error.code, error.message, requestId, error.details), error.status)
  }

  console.error(`[${requestId}]`, error)
  return c.json(
    buildApiError(
      'internal',
      `Something failed on the server. Search your cms-server logs for request id ${requestId}.`,
      requestId,
    ),
    500,
  )
}
