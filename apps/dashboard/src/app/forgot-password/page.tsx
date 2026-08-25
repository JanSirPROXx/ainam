'use client'

import { Button, Field, Input } from '@ainam/ui'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'
import { AuthCard } from '@/components/AuthCard'
import { authClient } from '@/lib/auth-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setPending(false)
    // Reported the same way whether or not the address exists: a different
    // answer would turn this form into a way to find out who has an account.
    setSent(true)
  }

  return (
    <AuthCard
      title="Reset your password"
      description="We send a link that works once."
      footer={
        <span style={{ font: 'var(--type-caption)' }}>
          <Link href="/sign-in">Back to sign in</Link>
        </span>
      }
    >
      {sent ? (
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
          If {email} has an account, a link is on its way. On an instance with no mail server
          configured, it is printed in the cms-server log instead.
        </p>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Button type="submit" loading={pending} fullWidth>
            Send the link
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
