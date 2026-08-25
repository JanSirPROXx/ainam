'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from './auth-client'

/**
 * Sends an unauthenticated visitor to sign in, and reports when it is safe to
 * fetch.
 *
 * Every signed-in page needs the same three-state handling — pending, absent,
 * present — and a page that forgets it renders a flash of empty content and a
 * burst of 401s before redirecting.
 */
export function useRequireSession(): { ready: boolean; email: string | undefined } {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) router.replace('/sign-in')
  }, [isPending, session, router])

  return { ready: Boolean(session), email: session?.user.email }
}
