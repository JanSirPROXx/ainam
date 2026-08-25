import type { Author } from '@ainam/schema'
import type { SessionUser } from '../../http/context'
import type { ProjectRecord } from '../../repositories/projects'
import type { WebhookTarget } from '../../services/webhook'

/**
 * What every admin write route derives from its request.
 *
 * Shared so a new route cannot attribute an edit differently, or reach for the
 * webhook secret in a way that lets it out of the server.
 */
export function authorOf(user: SessionUser): Author {
  return { kind: 'user', id: user.id }
}

export function webhookTargetOf(project: ProjectRecord): WebhookTarget {
  return { url: project.webhookUrl, secret: project.webhookSecret }
}
