'use client'

import { Button, Field, Input } from '@ainam/ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, Suspense, useState } from 'react'
import { AuthCard } from '@/components/AuthCard'
import { authClient } from '@/lib/auth-client'

function ResetForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await authClient.resetPassword({ newPassword: password, token })
    setPending(false)

    if (result.error) {
      setError(result.error.message ?? 'Could not set the password.')
      return
    }
    router.push('/sign-in')
  }

  if (token === '') {
    return (
      <AuthCard
        title="This link is incomplete"
        description="Open the link from your email, or ask for a new one."
        footer={
          <span style={{ font: 'var(--type-caption)' }}>
            <Link href="/forgot-password">Send another link</Link>
          </span>
        }
      >
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
          The reset token is missing from the address. Some mail clients cut long links in half.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new password" description="You will be signed in with it.">
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <Field label="New password" htmlFor="password" error={error ?? undefined}>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" loading={pending} fullWidth>
          Set password
        </Button>
      </form>
    </AuthCard>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
