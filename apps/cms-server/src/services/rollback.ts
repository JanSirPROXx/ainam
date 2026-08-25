import type { Author, ContentValue, RestoreResult } from '@ainam/schema'
import { validateContentValue } from '@ainam/schema'
import { eq, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentSchemas } from '../db/schema'
import { HttpError } from '../http/errors'
import { createId } from '../lib/ids'
import { createPublishingRepository } from '../repositories/publishing'
import { type WebhookTarget, notifySite } from './webhook'

export interface RestoredValue {
  key: string
  value: ContentValue
  /** The version being put back, quoted when the value no longer validates. */
  version: number
}

export interface Rollback {
  projectId: string
  locale: string
  values: RestoredValue[]
  /** Keys with no earlier state. Carried through to the result, never written. */
  skipped: string[]
  author: Author
  webhook: WebhookTarget
}

/**
 * Puts a set of historical values back, as one new publish.
 *
 * The draft row is written alongside the published one. Without that, the value
 * someone just rolled back sits in the editor untouched and returns to the live
 * site on their next unrelated publish — the rollback would appear to work and
 * then quietly undo itself.
 *
 * A new version is recorded rather than the counter being rewound, so the
 * rollback is itself in the history and itself undoable.
 */
export async function applyRollback(db: Database, rollback: Rollback): Promise<RestoreResult> {
  const { projectId, locale, author } = rollback

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`)
    await refuseValuesTheSchemaNoLongerAccepts(tx as unknown as Database, projectId, rollback.values)

    const publishing = createPublishingRepository(tx as unknown as Database)
    const publishedAt = new Date()
    const publishId = createId('pub')
    const restored: string[] = []

    for (const { key, value } of rollback.values) {
      const write = { projectId, key, locale, value, author, at: publishedAt }
      // The value comes from history, which is append-only, so reading it
      // outside this lock is safe. The version it lands on is computed inside,
      // from the row that is live right now.
      if ((await publishing.publishValue(write, publishId)) !== undefined) restored.push(key)
      await publishing.overwriteDraft(write)
    }

    return { restored, publishId, publishedAt: publishedAt.toISOString() }
  })

  return {
    ...result,
    skipped: rollback.skipped,
    webhook: await notifySite(rollback.webhook, {
      projectId,
      locale,
      published: result.restored,
      publishedAt: result.publishedAt,
    }),
  }
}

/**
 * Refuses the one route by which a mistyped value could still reach a live page.
 *
 * Every other write validates at the boundary, but a version written before a
 * `--allow-breaking` type change holds a value the current field rejects, and
 * restoring it would put it straight onto the site. Checked for the whole batch
 * before anything is written, so a revert is all-or-nothing like every other
 * multi-key write.
 */
async function refuseValuesTheSchemaNoLongerAccepts(
  tx: Database,
  projectId: string,
  values: RestoredValue[],
): Promise<void> {
  const [stored] = await tx
    .select({ schema: contentSchemas.schema })
    .from(contentSchemas)
    .where(eq(contentSchemas.projectId, projectId))
    .limit(1)
  if (!stored) {
    throw new HttpError(
      404,
      'not_found',
      `Project ${projectId} has no content schema. Run "ainam push" from the website's codebase.`,
    )
  }

  const problems = values.flatMap(({ key, value, version }) => {
    const field = stored.schema[key]
    if (!field) {
      return [{ path: key, message: `"${key}" is no longer in the schema, so it cannot be restored.` }]
    }
    const problem = validateContentValue(field, value)
    return problem
      ? [{ path: key, message: `Version ${version} does not fit the current field. ${problem}` }]
      : []
  })

  if (problems.length > 0) {
    throw new HttpError(
      422,
      'validation_failed',
      `${problems.length === 1 ? 'One key has' : `${problems.length} keys have`} changed type since ` +
        'that version was written. Push a schema that accepts these values, or restore a different version.',
      problems,
    )
  }
}
