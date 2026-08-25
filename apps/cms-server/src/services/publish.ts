import type { Author, PublishRequest, PublishResult } from '@ainam/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentEntries, contentVersions } from '../db/schema'
import { createId } from '../lib/ids'
import { type WebhookTarget, deliverPublishWebhook } from './webhook'

/**
 * Copies the draft over the published copy, and records what was replaced.
 *
 * One transaction under an advisory lock, so a publish cannot interleave with a
 * schema push or another publish and leave a locale half-live. The history row
 * is written in the same transaction: a published value that nobody can roll
 * back to would defeat the point of having history at all.
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

    const filters = [
      eq(contentEntries.projectId, projectId),
      eq(contentEntries.locale, request.locale),
      eq(contentEntries.status, 'draft'),
    ]
    if (request.keys && request.keys.length > 0) {
      filters.push(inArray(contentEntries.key, request.keys))
    }

    const drafts = await tx.select().from(contentEntries).where(and(...filters))
    if (drafts.length === 0) return { published: [], publishedAt: new Date().toISOString() }

    const publishedAt = new Date()
    const published: string[] = []

    for (const draft of drafts) {
      const [live] = await tx
        .select({ value: contentEntries.value, version: contentEntries.version })
        .from(contentEntries)
        .where(
          and(
            eq(contentEntries.projectId, projectId),
            eq(contentEntries.locale, request.locale),
            eq(contentEntries.key, draft.key),
            eq(contentEntries.status, 'published'),
          ),
        )
        .limit(1)

      // Nothing changed for this key; publishing it would add a history row
      // that says the same thing twice.
      if (live && JSON.stringify(live.value) === JSON.stringify(draft.value)) continue

      const version = (live?.version ?? 0) + 1

      await tx
        .insert(contentEntries)
        .values({
          id: createId('entry'),
          projectId,
          key: draft.key,
          locale: request.locale,
          status: 'published',
          value: draft.value,
          version,
          updatedAt: publishedAt,
          updatedBy: author,
        })
        .onConflictDoUpdate({
          target: [
            contentEntries.projectId,
            contentEntries.key,
            contentEntries.locale,
            contentEntries.status,
          ],
          set: { value: draft.value, version, updatedAt: publishedAt, updatedBy: author },
        })

      await tx.insert(contentVersions).values({
        id: createId('ver'),
        projectId,
        key: draft.key,
        locale: request.locale,
        version,
        value: draft.value,
        createdAt: publishedAt,
        author,
      })

      published.push(draft.key)
    }

    return { published, publishedAt: publishedAt.toISOString() }
  })

  // Outside the transaction, deliberately: a site that revalidated while it was
  // still open would read the previous value and cache it as the new one.
  if (result.published.length === 0) {
    // Nothing changed, so there is nothing to notify about. Report the target's
    // state rather than claiming a delivery that never happened.
    return { ...result, webhook: webhook.url ? 'delivered' : 'not-configured' }
  }

  const delivery = await deliverPublishWebhook(webhook, {
    projectId,
    locale: request.locale,
    published: result.published,
    publishedAt: result.publishedAt,
  })
  return { ...result, webhook: delivery }
}
