'use client'

import { Button } from '@ainam/ui'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { AuthCard } from '@/components/AuthCard'
import { organization, useSession } from '@/lib/auth-client'

/**
 * Turns an invitation into a membership.
 *
 * Accepting needs a signed-in user, so someone who has never used AINAM is sent
 * to create an account and back here — carrying this address, or the invitation
 * they were sent would be left unaccepted with nothing saying so.
 */
export default function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>
}) {
  const { invitationId } = use(params)
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (isPending || session) return
    const next = encodeURIComponent(`/accept-invitation/${invitationId}`)
    router.replace(`/sign-up?next=${next}`)
  }, [isPending, session, invitationId, router])

  async function accept() {
    setAccepting(true)
    setError(null)

    const result = await organization.acceptInvitation({ invitationId })
    setAccepting(false)

    if (result.error) {
      setError(result.error.message ?? 'This invitation could not be accepted.')
      return
    }
    router.push('/')
  }

  return (
    <AuthCard
      title="Join this organisation"
      description={session ? `Signed in as ${session.user.email}.` : 'Checking your session.'}
    >
      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        {error ? (
          <p style={{ font: 'var(--type-body)', color: 'var(--status-danger)' }}>{error}</p>
        ) : null}
        <Button fullWidth disabled={!session} loading={accepting} onClick={() => void accept()}>
          Accept invitation
        </Button>
      </div>
    </AuthCard>
  )
}
