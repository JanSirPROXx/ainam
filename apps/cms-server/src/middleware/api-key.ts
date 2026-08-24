import type { ApiKeyScope } from '@ainam/schema'
import type { MiddlewareHandler } from 'hono'
import type { Database } from '../db/client'
import { hashApiKey } from '../lib/api-key'
import { HttpError } from '../http/errors'
import type { AppEnv } from '../http/context'
import { createApiKeyRepository } from '../repositories/api-keys'

const REJECTED =
  'The API key was rejected. Check AINAM_API_KEY, and that the key has not been revoked or expired.'

/**
 * Authenticates a project by its API key.
 *
 * The project a request may touch comes from the key, never from the URL — a
 * caller must not be able to name someone else's project and be believed.
 *
 * The required scope is a parameter rather than a check inside each route, so a
 * new route cannot be added without deciding what it needs.
 */
export function requireApiKey(db: Database, scope: ApiKeyScope): MiddlewareHandler<AppEnv> {
  const keys = createApiKeyRepository(db)

  return async function apiKeyMiddleware(c, next) {
    const header = c.req.header('authorization')
    const token = header?.startsWith('Bearer ') === true ? header.slice(7).trim() : ''
    if (token === '') {
      throw new HttpError(401, 'unauthorized', 'Missing `Authorization: Bearer <key>` header.')
    }

    const key = await keys.findActiveByHash(hashApiKey(token))
    if (!key) throw new HttpError(401, 'unauthorized', REJECTED)

    if (!key.scopes.includes(scope)) {
      // Named explicitly: a developer holding a read key and wondering why
      // `ainam push` fails should not have to guess at our permission model.
      throw new HttpError(
        403,
        'forbidden',
        `This API key is missing the "${scope}" scope. Create a key with it in the dashboard.`,
      )
    }

    c.set('projectId', key.projectId)
    await next()

    // After the response, and deliberately unawaited: recording use must not
    // add latency to a read, and failing to record it must not fail the read.
    void keys.touchLastUsed(key, new Date()).catch(() => undefined)
  }
}
