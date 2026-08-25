import { previewSignaturePayload, signWebhookBody } from '@ainam/core'
import type { PreviewLink } from '@ainam/schema'
import { HttpError } from '../http/errors'
import type { ProjectRecord } from '../repositories/projects'

/**
 * Long enough to open the link and look at the page, short enough that one
 * pasted into a chat thread stops working before anyone finds it there.
 */
const TTL_MINUTES = 15

/**
 * Signs a link that turns draft mode on for the customer's site.
 *
 * Signed and expiring rather than a bare secret in a query string: a preview
 * link is pasted around and left in browser history, and anything durable there
 * would expose every future draft of the site to whoever finds it.
 */
export async function createPreviewLink(
  project: ProjectRecord,
  locale: string,
): Promise<PreviewLink> {
  if (!project.previewUrl) {
    throw new HttpError(
      409,
      'conflict',
      'This project has no preview URL. Set it in project settings, pointing at the route on ' +
        'your site that calls createPreviewHandler — usually /api/ainam/preview.',
    )
  }
  if (!project.webhookSecret) {
    throw new HttpError(
      409,
      'conflict',
      'This project has no webhook secret, so a preview link cannot be signed. Create one in ' +
        'project settings and put it in your site as AINAM_WEBHOOK_SECRET.',
    )
  }

  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000)
  const signature = await signWebhookBody(
    project.webhookSecret,
    previewSignaturePayload(project.id, locale, expiresAt.getTime()),
  )

  const url = new URL(project.previewUrl)
  url.searchParams.set('locale', locale)
  url.searchParams.set('expires', String(expiresAt.getTime()))
  url.searchParams.set('signature', signature)

  return { url: url.toString(), expiresAt: expiresAt.toISOString() }
}
