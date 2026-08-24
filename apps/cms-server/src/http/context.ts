import type { RequestIdVariables } from 'hono/request-id'

/**
 * Variables handlers can rely on being present.
 *
 * Declared once and threaded through `OpenAPIHono<AppEnv>` so a route reads
 * `c.get('projectId')` with a real type instead of re-narrowing `unknown`.
 */
export interface AppEnv {
  Variables: RequestIdVariables & {
    /** Set by the API-key middleware on every `/v1` route. */
    projectId: string
  }
}
