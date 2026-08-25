/**
 * Who may do what inside one organisation.
 *
 * Declared here rather than in either app because both need it: cms-server
 * builds Better Auth's access control from it and enforces it on every admin
 * route, and the dashboard reads it to decide which controls to render. Two
 * copies of a role string would let the UI offer an action the server refuses.
 *
 * The buyer is an agency that builds a site and hands editing to its client, so
 * the owner/editor split is the product rather than a configuration detail: an
 * editor changes and publishes content, and cannot rotate a key, repoint the
 * webhook or invite anyone.
 */

/**
 * Resources and the actions each one supports.
 *
 * The single source for both shapes below: the flat `resource:action` strings
 * the dashboard branches on, and the nested objects Better Auth's
 * `createAccessControl` expects.
 *
 * Only AINAM's own resources are here. Members and invitations belong to Better
 * Auth's organisation plugin, which authorises its own endpoints against its own
 * statements — see `access.ts`, which merges the two sets.
 */
export const AINAM_STATEMENTS = {
  content: ['edit', 'publish', 'restore'],
  project: ['manage'],
  apiKey: ['manage'],
} as const satisfies Record<string, readonly string[]>

type Statements = typeof AINAM_STATEMENTS

/** A `resource:action` pair — `content:publish`, `project:manage`. */
export type AinamPermission = {
  [Resource in keyof Statements]: `${Resource & string}:${Statements[Resource][number]}`
}[keyof Statements]

export type AinamRole = 'owner' | 'editor'

/** In the order they are offered when inviting someone: most capable first. */
export const AINAM_ROLES: readonly AinamRole[] = ['owner', 'editor']

type RoleStatements = { readonly [Resource in keyof Statements]?: readonly Statements[Resource][number][] }

/** What each role may do, in the shape the server hands to `ac.newRole()`. */
export const ROLE_STATEMENTS = {
  owner: {
    content: ['edit', 'publish', 'restore'],
    project: ['manage'],
    apiKey: ['manage'],
  },
  editor: {
    content: ['edit', 'publish', 'restore'],
  },
} as const satisfies Record<AinamRole, RoleStatements>

/** Shown when choosing a role, so the difference is stated rather than implied. */
export const ROLE_DESCRIPTIONS: Record<AinamRole, { name: string; describes: string }> = {
  owner: {
    name: 'Owner',
    describes: 'Edits and publishes content, and manages settings, keys and people.',
  },
  editor: {
    name: 'Editor',
    describes: 'Edits and publishes content. Cannot change settings, keys or people.',
  },
}

export function isAinamRole(role: string): role is AinamRole {
  return (AINAM_ROLES as readonly string[]).includes(role)
}

/**
 * Whether a role carries a permission.
 *
 * An unrecognised role carries nothing — a row written by an older version, or
 * a role since removed from this file, grants no access. Failing closed is the
 * only safe direction here: the cost is an owner who has to be re-invited,
 * against an editor who could delete someone's project.
 */
export function hasPermission(role: string, permission: AinamPermission): boolean {
  if (!isAinamRole(role)) return false

  const separator = permission.indexOf(':')
  const resource = permission.slice(0, separator)
  const action = permission.slice(separator + 1)

  const granted: Record<string, readonly string[] | undefined> = ROLE_STATEMENTS[role]
  return granted[resource]?.includes(action) ?? false
}
