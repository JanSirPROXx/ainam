import type { WebhookDelivery } from '@ainam/schema'
import { count } from '@/lib/plural'

/**
 * What to tell someone after a publish or a rollback.
 *
 * Shared by both because the question is the same one: did the live site
 * actually change. "Published but the page still shows the old text" is the
 * most confusing thing that can happen to a person editing a site, and the
 * answer belongs in the message rather than in a log nobody reads.
 */
export function publishOutcome(
  changed: number,
  webhook: WebhookDelivery,
  verb = 'Published',
): { tone: 'success' | 'error'; title: string; body?: string | undefined } {
  if (changed === 0) {
    return { tone: 'success', title: 'Nothing to publish', body: 'The live site already says this.' }
  }

  const title = `${verb} ${count(changed, 'key')}`
  if (webhook === 'failed') {
    return {
      tone: 'error',
      title,
      body: 'The site was not reachable, so it may still show the previous version.',
    }
  }
  if (webhook === 'not-configured') {
    return {
      tone: 'success',
      title,
      body: 'No webhook is configured, so the site refreshes on its next build.',
    }
  }
  return { tone: 'success', title }
}
