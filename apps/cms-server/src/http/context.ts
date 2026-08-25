import type { RequestIdVariables } from 'hono/request-id'

/** The authenticated caller behind an admin request. */
export interface SessionUser {
  id: string
  email: string
  name: string
}

/**
 * Variables handlers can rely on being present.
 *
 * Declared once and threaded through `OpenAPIHono<AppEnv>` so a route reads
 * `c.get('projectId')` with a real type instead of re-narrowing `unknown`.
 * `projectId` is set by the API-key middleware on `/v1`; `user` by the session
 * middleware on `/admin`. No route sees both.
 */
export interface AppEnv {
  Variables: RequestIdVariables & {
    projectId: string
    user: SessionUser
  }
}
