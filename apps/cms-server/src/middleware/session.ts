import type { MiddlewareHandler } from 'hono'
import type { Auth } from '../auth'
import type { AppEnv } from '../http/context'
import { HttpError } from '../http/errors'

/**
 * Resolves the signed-in user for the admin API.
 *
 * Rejecting here rather than in each route means a new admin route cannot be
 * added without authentication — the failure mode is a 401, not an open
 * endpoint nobody noticed.
 */
export function requireSession(auth: Auth): MiddlewareHandler<AppEnv> {
  return async function sessionMiddleware(c, next) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) {
      throw new HttpError(
        401,
        'unauthorized',
        'Not signed in. The dashboard should redirect to the sign-in page.',
      )
    }

    c.set('user', {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    })
    await next()
  }
}
