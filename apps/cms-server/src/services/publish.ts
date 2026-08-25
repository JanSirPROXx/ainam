import type { Author, PublishRequest, PublishResult } from '@ainam/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentEntries } from '../db/schema'
import { createId } from '../lib/ids'
import { createPublishingRepository } from '../repositories/publishing'
import { type WebhookTarget, notifySite } from './webhook'

/**
 * Copies the draft over the published copy, and records what was replaced.
 *
 * One transaction under an advisory lock, so a publish cannot interleave with a
 * schema push or another publish and leave a locale half-live. The history row
 * is written in the same transaction: a published value nobody can roll back to
 * would defeat the point of having history at all.
 */
export async function publishContent(
  db: Database,
  projectId: string,
  request: PublishRequest,
  author: Author,
  webhook: WebhookTarget,
): Promise<PublishResult> {
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`)
    const publishing = createPublishingRepository(tx as unknown as Database)

    const filters = [
      eq(contentEntries.projectId, projectId),
      eq(contentEntries.locale, request.locale),
      eq(contentEntries.status, 'draft'),
    ]
    if (request.keys && request.keys.length > 0) {
      filters.push(inArray(contentEntries.key, request.keys))
    }

    const drafts = await tx.select().from(contentEntries).where(and(...filters))

    const publishedAt = new Date()
    // One id across every key that goes live together, so "undo what I just
    // published" can name the event instead of guessing at a time range.
    const publishId = createId('pub')
    const published: string[] = []

    for (const draft of drafts) {
      const version = await publishing.publishValue(
        {
          projectId,
          key: draft.key,
          locale: request.locale,
          value: draft.value ?? null,
          author,
          at: publishedAt,
        },
        publishId,
      )
      // undefined means the live value already said this, so nothing was
      // written and nothing changed for the site.
      if (version !== undefined) published.push(draft.key)
    }

    return { published, publishedAt: publishedAt.toISOString() }
  })

  return {
    ...result,
    webhook: await notifySite(webhook, {
      projectId,
      locale: request.locale,
      published: result.published,
      publishedAt: result.publishedAt,
    }),
  }
}
