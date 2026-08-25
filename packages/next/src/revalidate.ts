import { signWebhookBody } from '@ainam/core'
import { revalidateTag } from 'next/cache'
import { digestsMatch } from './digest'
import { refuseWithoutSecret } from './secret'
import { contentTag } from './tags'

export interface RevalidateHandlerConfig {
  /** Shared secret. Signs the body; it is never sent. */
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
 * Builds the route handler that the CMS calls after a publish.
 *
 * The signature is an HMAC over the request body, not the shared secret itself:
 * a bare secret in a header can be replayed by anything that observes one
 * delivery, and says nothing about whether the body was altered on the way.
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
    const unconfigured = refuseWithoutSecret(config.secret)
    if (unconfigured) return unconfigured

    const signature = request.headers.get('x-ainam-signature')
    if (signature === null) {
      return Response.json({ error: 'Missing x-ainam-signature.' }, { status: 401 })
    }

    // Read once, as text: the signature covers the exact bytes sent, so parsing
    // first and re-serialising would verify something the CMS never signed.
    const body = await request.text()
    if (!digestsMatch(signature, await signWebhookBody(config.secret, body))) {
      return Response.json({ error: 'Invalid signature.' }, { status: 401 })
    }

    let payload: { projectId?: string; locale?: string }
    try {
      payload = JSON.parse(body) as typeof payload
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
