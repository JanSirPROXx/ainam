import type { Author, RestoreResult, RestoreVersionRequest, RevertPublishRequest } from '@ainam/schema'
import type { Database } from '../db/client'
import { HttpError } from '../http/errors'
import { createHistoryRepository } from '../repositories/history'
import { type RestoredValue, applyRollback } from './rollback'
import type { WebhookTarget } from './webhook'

/**
 * The two ways back.
 *
 * Both decide *what* to put back and hand it to `applyRollback`, which decides
 * *how*: one publish, draft written alongside the live value, recorded so the
 * rollback is itself undoable. Keeping the mechanism in one place is what stops
 * a second entry point from quietly skipping half of it.
 */

/** Puts one key back to what it said at a chosen version. */
export async function restoreVersion(
  db: Database,
  projectId: string,
  request: RestoreVersionRequest,
  author: Author,
  webhook: WebhookTarget,
): Promise<RestoreResult> {
  const ref = { projectId, key: request.key, locale: request.locale }
  const version = await createHistoryRepository(db).findVersion(ref, request.version)
  if (!version) {
    throw new HttpError(
      404,
      'not_found',
      `No version ${request.version} of "${request.key}" in locale ${request.locale}.`,
    )
  }

  return applyRollback(db, {
    projectId,
    locale: request.locale,
    values: [{ key: request.key, value: version.value, version: version.version }],
    skipped: [],
    author,
    webhook,
  })
}

/**
 * Undoes one publish, by republishing what each of its keys said beforehand.
 *
 * A key the publish introduced has no earlier state to return to; it is named
 * in `skipped` rather than blanked, because a page rendering nothing is not
 * what "undo" was asked for.
 */
export async function revertPublish(
  db: Database,
  projectId: string,
  request: RevertPublishRequest,
  author: Author,
  webhook: WebhookTarget,
): Promise<RestoreResult> {
  const history = createHistoryRepository(db)
  const rows = await history.findPublishRows(projectId, request.publishId)
  if (rows.length === 0) {
    throw new HttpError(404, 'not_found', `No publish ${request.publishId} in this project.`)
  }

  // Every row of a publish shares its locale, so the first one settles it.
  const locale = rows[0]?.locale ?? ''

  const values: RestoredValue[] = []
  const skipped: string[] = []

  for (const row of rows) {
    const previous = await history.findPrecedingVersion(
      { projectId, key: row.key, locale },
      row.version,
    )
    if (previous) values.push({ key: row.key, value: previous.value, version: previous.version })
    else skipped.push(row.key)
  }

  return applyRollback(db, { projectId, locale, values, skipped, author, webhook })
}
