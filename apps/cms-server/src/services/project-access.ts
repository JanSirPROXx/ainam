import type { Database } from '../db/client'
import { HttpError } from '../http/errors'
import { type ProjectSummary, createProjectRepository } from '../repositories/projects'

/**
 * Resolves a project the caller is actually allowed to touch.
 *
 * Reported as 404 rather than 403 when the caller is not a member: telling
 * someone that a project exists but is not theirs is itself a disclosure, and
 * the two cases are indistinguishable to a legitimate user anyway.
 */
export async function requireProject(
  db: Database,
  projectId: string,
  userId: string,
): Promise<ProjectSummary> {
  const project = await createProjectRepository(db).findForUser(projectId, userId)
  if (!project) {
    throw new HttpError(404, 'not_found', `No project ${projectId} in any organisation you belong to.`)
  }
  return project
}
