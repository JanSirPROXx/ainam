import type { CreateProjectRequest } from '@ainam/schema'
import { randomBytes } from 'node:crypto'
import type { Database } from '../db/client'
import { slugify } from '../lib/slug'
import { createProjectRepository } from '../repositories/projects'

/** Locale until `ainam push` declares the real ones. */
const INITIAL_LOCALE = 'en'

/**
 * Creates a project in an organisation of its own, owned by the caller.
 *
 * One organisation per client site is the tenancy shape: it is what lets an
 * agency owner invite a client editor into one site without that editor seeing
 * any other. Putting a new project into an existing organisation would hand its
 * members a site they were never invited to, so this never does.
 *
 * Returns the project id; the caller reads the project back through the
 * membership join, so what the browser sees is what it is allowed to see.
 */
export async function createProjectForUser(
  db: Database,
  userId: string,
  request: CreateProjectRequest,
): Promise<string> {
  const slug = slugify(request.name)

  const { projectId } = await db.transaction((tx) =>
    createProjectRepository(tx as unknown as Database).createWithOrganization({
      organizationName: request.name,
      // Organisation slugs are unique across the instance, while a project slug
      // only has to be unique inside its organisation. Two agencies that both
      // name a site "Acme web" must not collide, and must not learn from the
      // error that the other one exists.
      organizationSlug: `${slug}-${randomBytes(4).toString('hex')}`,
      projectName: request.name,
      projectSlug: slug,
      defaultLocale: INITIAL_LOCALE,
      ownerUserId: userId,
    }),
  )

  return projectId
}
