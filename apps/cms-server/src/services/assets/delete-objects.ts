import { eq } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { projects } from '../../db/schema'
import { type Storage, projectPrefix } from '../../storage'

/**
 * Removes a project's stored bytes.
 *
 * The rows go on their own — `assets.project_id` cascades — but the objects do
 * not, and nothing else would ever notice: stranded bytes surface only as a
 * storage invoice, months later, for content nobody can reach. Keys are laid
 * out one prefix per project precisely so this is a single call.
 *
 * Failures are reported, not thrown. A bucket that is briefly unreachable must
 * not stop someone deleting their project; the cost of the leftovers is money,
 * and the cost of a project that cannot be deleted is trust.
 */
export async function deleteProjectObjects(
  storage: Storage | undefined,
  projectId: string,
): Promise<number> {
  if (!storage) return 0

  try {
    return await storage.store.deletePrefix(projectPrefix(projectId))
  } catch (error) {
    console.error(
      `[ainam] Could not remove stored objects for project ${projectId}. They are now orphaned ` +
        `under the prefix "${projectPrefix(projectId)}". Cause: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    )
    return 0
  }
}

/**
 * The same, for every project in an organisation.
 *
 * Deleting an organisation cascades all the way down to assets, so without this
 * the one action that removes the most data is also the one that strands the
 * most bytes.
 */
export async function deleteOrganizationObjects(
  db: Database,
  storage: Storage | undefined,
  organizationId: string,
): Promise<void> {
  if (!storage) return

  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.organizationId, organizationId))

  for (const row of rows) await deleteProjectObjects(storage, row.id)
}
