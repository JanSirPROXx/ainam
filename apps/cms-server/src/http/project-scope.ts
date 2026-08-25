import type { Context } from 'hono'
import type { AppEnv } from './context'
import { HttpError } from './errors'

/**
 * Refuses a request that names a project its API key does not belong to.
 *
 * Reported as "not found" rather than "forbidden": confirming that a project
 * exists to someone holding a key for a different one is itself a disclosure.
 *
 * Shared by every keyed route, so the answer cannot differ between two of them
 * and reveal by contrast which projects are real.
 */
export function assertKeyOwnsProject(c: Context<AppEnv>, projectId: string): void {
  if (projectId === c.get('projectId')) return
  throw new HttpError(
    404,
    'not_found',
    `Project ${projectId} was not found on this server. Check projectId and that the API key belongs to it.`,
  )
}
