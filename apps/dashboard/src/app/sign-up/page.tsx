'use client'

import { Button, Field, Input } from '@ainam/ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, Suspense, useState } from 'react'
import { AuthCard } from '@/components/AuthCard'
import { signUp } from '@/lib/auth-client'

function SignUpForm() {
  const router = useRouter()
  // An invited person lands here from the invitation, and has to end up back at
  // it — sending them to the project list would strand the invitation unaccepted.
  const next = useSearchParams().get('next') ?? '/'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await signUp.email({ name, email, password })
    setPending(false)

    if (result.error) {
      setError(result.error.message ?? 'Could not create the account.')
      return
    }
    router.push(next)
  }

  return (
    <AuthCard
      title="Create an account"
      description="Then open the invitation you were sent."
      footer={
        <span style={{ font: 'var(--type-caption)' }}>
          <Link href="/sign-in">Already have an account?</Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </Field>
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
        <Field label="Password" htmlFor="password" error={error ?? undefined}>
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
          Create account
        </Button>
      </form>
    </AuthCard>
  )
}

export default function SignUpPage() {
  // useSearchParams needs a Suspense boundary, or the whole route opts out of
  // static rendering.
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}
