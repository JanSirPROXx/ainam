import type { AinamPermission } from '@ainam/schema'
import { ROLE_DESCRIPTIONS, hasPermission, isAinamRole } from '@ainam/schema'
import type { Database } from '../db/client'
import { HttpError } from '../http/errors'
import { type ProjectRecord, createProjectRepository } from '../repositories/projects'

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
): Promise<ProjectRecord> {
  const project = await createProjectRepository(db).findForUser(projectId, userId)
  if (!project) {
    throw new HttpError(404, 'not_found', `No project ${projectId} in any organisation you belong to.`)
  }
  return project
}

/**
 * The same, plus what the caller's role allows.
 *
 * 403 rather than 404 here, unlike above: the caller is a member and already
 * knows the project exists, so hiding it would only make a role they do have
 * look like a project they do not.
 */
export async function requireProjectPermission(
  db: Database,
  projectId: string,
  userId: string,
  permission: AinamPermission,
): Promise<ProjectRecord> {
  const project = await requireProject(db, projectId, userId)
  if (hasPermission(project.role, permission)) return project

  const role = isAinamRole(project.role)
    ? `An ${ROLE_DESCRIPTIONS[project.role].name.toLowerCase()}`
    : `The role "${project.role}"`
  throw new HttpError(
    403,
    'forbidden',
    `${role} cannot do this. Ask an owner of this organisation, or ask them to change your role.`,
  )
}
