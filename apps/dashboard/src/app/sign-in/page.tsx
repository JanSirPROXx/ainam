'use client'

import { Button, Card, Field, Input, Wordmark } from '@ainam/ui'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { signIn } from '@/lib/auth-client'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await signIn.email({ email, password })
    setPending(false)

    if (result.error) {
      // The server's message, not a generic one: "that email is not registered"
      // and "wrong password" need different actions from the reader.
      setError(result.error.message ?? 'Could not sign in.')
      return
    }
    router.push('/')
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 'var(--space-7)' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'grid', gap: 'var(--space-8)' }}>
        <Wordmark />
        <Card title="Sign in" description="Edit the content of your site.">
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password" htmlFor="password" error={error ?? undefined}>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" loading={pending} fullWidth>
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
