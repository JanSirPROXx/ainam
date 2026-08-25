'use client'

import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * Talks to cms-server's auth routes.
 *
 * The dashboard has no database of its own and never will — it is a pure client
 * of the admin API, which is what keeps the self-hosting story "run the server,
 * point any dashboard at it".
 */
export const authClient = createAuthClient({
  baseURL: process.env['NEXT_PUBLIC_CMS_URL'] ?? 'http://localhost:8787',
  plugins: [organizationClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient
