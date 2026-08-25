'use client'

import type { ApiError } from '@ainam/schema'

const BASE = process.env['NEXT_PUBLIC_CMS_URL'] ?? 'http://localhost:8787'

export class AdminApiError extends Error {
  readonly code: ApiError['error']['code']
  readonly requestId: string

  constructor(error: ApiError['error']) {
    super(error.message)
    this.name = 'AdminApiError'
    this.code = error.code
    this.requestId = error.requestId
  }
}

/**
 * Calls the admin API with the session cookie.
 *
 * Errors are rethrown as `AdminApiError` carrying the server's code and request
 * id, so a screen can branch on `code` and a bug report can quote the id — the
 * message is for a person, never for a condition.
 */
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    // Without this the session cookie is not sent cross-origin and every call
    // is a 401 that looks like a login bug.
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null
    throw new AdminApiError(
      body?.error ?? {
        code: 'internal',
        message: `The server returned ${response.status}.`,
        requestId: 'unknown',
      },
    )
  }

  return (await response.json()) as T
}
