import { previewSignaturePayload, signWebhookBody } from '@ainam/core'
import { draftMode } from 'next/headers'
import { digestsMatch } from './digest'
import { refuseWithoutSecret } from './secret'

export interface PreviewHandlerConfig {
  /** The project's webhook secret. The same one that signs publish deliveries. */
  secret: string
  /** Project this route accepts preview links for. */
  projectId: string
  /** Where to send the visitor once draft mode is on. Defaults to `/`. */
  redirectTo?: string
}

function redirect(request: Request, path: string): Response {
  // Resolved against the incoming URL, so the destination is always this site.
  // A path taken from the query string would turn the preview link into an open
  // redirect that anyone could point anywhere.
  return Response.redirect(new URL(path, request.url), 307)
}

/**
 * Builds the route that turns draft mode on from a link in the AINAM editor.
 *
 * The link is signed and short-lived rather than a bare secret in a query
 * string: it is pasted into chat and left in browser history, and anything
 * durable there would expose every future draft of the site.
 *
 * `?exit=1` turns draft mode off and needs no signature — removing access is not
 * a privilege, and a visitor stuck in draft mode with no way out is a worse
 * outcome than an unauthenticated way to leave it.
 *
 * @example
 * ```ts
 * // app/api/ainam/preview/route.ts
 * export const GET = createPreviewHandler({
 *   secret: process.env.AINAM_WEBHOOK_SECRET!,
 *   projectId: process.env.AINAM_PROJECT_ID!,
 * })
 * ```
 */
export function createPreviewHandler(
  config: PreviewHandlerConfig,
): (request: Request) => Promise<Response> {
  const destination = config.redirectTo ?? '/'

  return async function handlePreview(request: Request): Promise<Response> {
    const query = new URL(request.url).searchParams

    // Before the secret check: leaving draft mode needs no verification, and
    // an unconfigured site must not be able to trap someone in it.
    if (query.get('exit') !== null) {
      ;(await draftMode()).disable()
      return redirect(request, destination)
    }

    const unconfigured = refuseWithoutSecret(config.secret)
    if (unconfigured) return unconfigured

    const locale = query.get('locale')
    const expiresAt = Number(query.get('expires'))
    const signature = query.get('signature')

    if (locale === null || signature === null || !Number.isSafeInteger(expiresAt)) {
      return Response.json(
        { error: 'Expected locale, expires and signature. Open the preview link from AINAM.' },
        { status: 400 },
      )
    }

    if (expiresAt < Date.now()) {
      return Response.json(
        { error: 'This preview link has expired. Open a new one from AINAM.' },
        { status: 401 },
      )
    }

    const expected = await signWebhookBody(
      config.secret,
      previewSignaturePayload(config.projectId, locale, expiresAt),
    )
    if (!digestsMatch(signature, expected)) {
      return Response.json({ error: 'Invalid preview signature.' }, { status: 401 })
    }

    ;(await draftMode()).enable()
    return redirect(request, destination)
  }
}
