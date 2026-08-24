import { revalidateTag } from 'next/cache'
import { contentTag } from './tags'

export interface RevalidateHandlerConfig {
  /** Shared secret, sent by the CMS as the `x-ainam-signature` header. */
  secret: string
  /** Project this route accepts webhooks for. */
  projectId: string
  /**
   * cacheLife profile the tag is revalidated against. Defaults to `'max'`.
   *
   * Next 16 requires this second argument; `updateTag`, which expires
   * immediately, is restricted to Server Actions and so is not available to a
   * webhook route. Pass `{ expire: 0 }` if the default is not aggressive enough.
   */
  profile?: string | { expire?: number }
}

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * A plain `===` returns as soon as two bytes differ, which lets an attacker
 * recover the secret one character at a time. The length is compared first and
 * separately — that much is unavoidably observable.
 */
function secretsMatch(received: string, expected: string): boolean {
  if (received.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Builds the route handler that the CMS calls after a publish.
 *
 * @example
 * ```ts
 * // app/api/ainam/revalidate/route.ts
 * export const POST = createRevalidateHandler({
 *   secret: process.env.AINAM_WEBHOOK_SECRET!,
 *   projectId: process.env.AINAM_PROJECT_ID!,
 * })
 * ```
 */
export function createRevalidateHandler(
  config: RevalidateHandlerConfig,
): (request: Request) => Promise<Response> {
  return async function handleRevalidate(request: Request): Promise<Response> {
    const signature = request.headers.get('x-ainam-signature')
    if (signature === null || !secretsMatch(signature, config.secret)) {
      return Response.json({ error: 'Invalid signature.' }, { status: 401 })
    }

    let payload: { projectId?: string; locale?: string }
    try {
      payload = (await request.json()) as typeof payload
    } catch {
      return Response.json({ error: 'Body is not valid JSON.' }, { status: 400 })
    }

    if (payload.projectId !== config.projectId) {
      return Response.json(
        { error: `This route handles project ${config.projectId}.` },
        { status: 400 },
      )
    }
    if (typeof payload.locale !== 'string') {
      return Response.json({ error: 'Missing "locale".' }, { status: 400 })
    }

    const tag = contentTag(payload.projectId, payload.locale)
    revalidateTag(tag, config.profile ?? 'max')
    return Response.json({ revalidated: tag })
  }
}
