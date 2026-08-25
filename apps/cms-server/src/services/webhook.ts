// Imported from the SDK rather than reimplemented: the site verifies the same
// signature, and two derivations that can drift would fail closed only after a
// customer's publishes stopped reaching their page.
import { signWebhookBody } from '@ainam/core'
import type { WebhookDelivery } from '@ainam/schema'

export interface WebhookTarget {
  url: string | null
  secret: string | null
}

export interface PublishNotification {
  projectId: string
  locale: string
  published: string[]
  publishedAt: string
}

const TIMEOUT_MS = 5000

/**
 * Tells a site that its content changed, when there is something to tell it.
 *
 * Called after the publish transaction commits, never inside it: a site that
 * revalidated mid-transaction would read the old value and cache it as new.
 *
 * A failed delivery does not fail the publish — the content is live either way,
 * and rolling it back because a customer's site was briefly down would be worse.
 * The outcome is returned so the dashboard can say so plainly.
 */
export async function notifySite(
  target: WebhookTarget,
  payload: PublishNotification,
): Promise<WebhookDelivery> {
  if (payload.published.length === 0) return 'skipped'
  if (!target.url || !target.secret) return 'not-configured'

  const body = JSON.stringify(payload)
  try {
    const response = await fetch(target.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ainam-signature': await signWebhookBody(target.secret, body),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.ok) return 'delivered'
    console.warn(`[ainam] Webhook to ${target.url} returned ${response.status}`)
    return 'failed'
  } catch (error) {
    console.warn(
      `[ainam] Webhook to ${target.url} failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    return 'failed'
  }
}
