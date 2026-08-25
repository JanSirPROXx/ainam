'use client'

import { Button, Select, Wordmark } from '@ainam/ui'
import Link from 'next/link'
import {
  organization,
  signOut,
  useActiveOrganization,
  useListOrganizations,
} from '@/lib/auth-client'

/**
 * The organisation switcher and the way out.
 *
 * An agency owner belongs to one organisation per client site, so "which client
 * am I looking at" is a question every screen has to answer. The active
 * organisation lives in the session rather than in component state, so it
 * survives a reload and the server sees the same answer the browser does.
 */
export function Topbar({ email }: { email?: string | undefined }) {
  const organizations = useListOrganizations()
  const active = useActiveOrganization()

  const options = (organizations.data ?? []).map((org) => ({ value: org.id, label: org.name }))

  return (
    <header
      style={{
        height: 'var(--topbar-h)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-5)',
        padding: '0 var(--gutter-page)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <Link href="/" aria-label="AINAM, back to projects">
        <Wordmark />
      </Link>

      {options.length > 1 ? (
        <Select
          size="sm"
          aria-label="Organisation"
          placeholder="All organisations"
          options={options}
          value={active.data?.id ?? ''}
          onChange={(event) => {
            void organization.setActive({ organizationId: event.target.value })
          }}
        />
      ) : null}

      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        {email ? (
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{email}</span>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
