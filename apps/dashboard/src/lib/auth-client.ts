'use client'

import { accessControl, roles } from '@ainam/schema/access'
import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { cmsUrl } from './runtime-config'

/**
 * Talks to cms-server's auth routes.
 *
 * The dashboard has no database of its own and never will — it is a pure client
 * of the admin API, which is what keeps the self-hosting story "run the server,
 * point any dashboard at it".
 */
export const authClient = createAuthClient({
  baseURL: cmsUrl(),
  // The same access control the server enforces. Without it the client types
  // roles against Better Auth's built-in set and refuses to invite an editor.
  plugins: [organizationClient({ ac: accessControl, roles })],
})

export const { signIn, signUp, signOut, useSession, organization, useActiveOrganization, useListOrganizations } =
  authClient

/**
 * Re-reads the organisation list.
 *
 * The client refreshes it by itself after its own `organization.create` call.
 * A project created through the admin API makes its organisation on the server,
 * so nothing on this side fires, and the topbar switcher would not list the new
 * organisation until a reload.
 */
export function refreshOrganizations(): void {
  authClient.$store.notify('$listOrg')
}
