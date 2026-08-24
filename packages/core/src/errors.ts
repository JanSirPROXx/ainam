/** Machine-readable reason a client call failed. */
export type AinamErrorCode =
  | 'config_invalid'
  | 'unauthorized'
  | 'not_found'
  | 'network'
  | 'timeout'
  | 'server'

/**
 * Error thrown by every `@ainam/core` entry point.
 *
 * Messages are written for someone debugging a self-hosted instance without
 * access to our logs: they name what failed and what to check.
 */
export class AinamError extends Error {
  readonly code: AinamErrorCode
  readonly status: number | undefined

  constructor(code: AinamErrorCode, message: string, options?: { status?: number; cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'AinamError'
    this.code = code
    this.status = options?.status
  }
}
