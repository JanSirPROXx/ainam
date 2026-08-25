'use client'

import { Button, Input } from '@ainam/ui'
import { useState } from 'react'

/**
 * The invitation link, shown so an owner can deliver it themselves.
 *
 * A self-hosted instance starts with no mail server — that is deliberate, so
 * `docker compose up` needs no external account — which means the invitation
 * was printed to the server log and not sent. Without this, the first thing an
 * owner does after inviting someone is read Docker logs.
 */
export function InvitationLink({ invitationId }: { invitationId: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/accept-invitation/${invitationId}`

  return (
    <div
      style={{
        marginTop: 'var(--space-5)',
        display: 'grid',
        gap: 'var(--space-3)',
      }}
    >
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
        Send this link if your instance has no mail server configured.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Input readOnly value={url} style={{ flex: 1 }} onFocus={(event) => event.target.select()} />
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => setCopied(true))
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  )
}
