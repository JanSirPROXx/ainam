'use client'

import type { ApiKeyScope, ApiKeySummary, CreatedApiKey } from '@ainam/schema'
import { Badge, Button, Card, Field, Input, Table } from '@ainam/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { timestamp } from '@/lib/format'
import { useToast } from '@/lib/toast'
import { RevealedSecret } from './RevealedSecret'

/**
 * What each key is for, in the order someone needs them.
 *
 * Named by purpose rather than by scope string: a developer choosing a key is
 * deciding what a deployment may do, not composing a permission set.
 */
const KEY_KINDS: Array<{ label: string; describes: string; scopes: ApiKeyScope[] }> = [
  {
    label: 'Site',
    describes: 'Reads published content. This is the one that goes in a deployment.',
    scopes: ['content:read'],
  },
  {
    label: 'Preview',
    describes: 'Also reads unpublished drafts, so the Preview button can show them.',
    scopes: ['content:read', 'content:read:draft'],
  },
  {
    label: 'Developer',
    describes: 'Also pushes the schema. Keep it with the developer, out of any deployment.',
    scopes: ['content:read', 'schema:write'],
  },
]

export function ApiKeysPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [kind, setKind] = useState(0)
  const [created, setCreated] = useState<CreatedApiKey | null>(null)

  const keys = useQuery({
    queryKey: ['api-keys', projectId],
    queryFn: () => adminFetch<{ keys: ApiKeySummary[] }>(`/admin/projects/${projectId}/api-keys`),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['api-keys', projectId] })

  const create = useMutation({
    mutationFn: () =>
      adminFetch<CreatedApiKey>(`/admin/projects/${projectId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ name, scopes: KEY_KINDS[kind]?.scopes ?? ['content:read'] }),
      }),
    onSuccess: async (key) => {
      setCreated(key)
      setName('')
      await refresh()
    },
    onError: toast.fail('Could not create the key'),
  })

  const revoke = useMutation({
    mutationFn: (keyId: string) =>
      adminFetch<{ revoked: boolean }>(`/admin/projects/${projectId}/api-keys/${keyId}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      toast.show({ tone: 'success', title: 'Key revoked' })
      await refresh()
    },
    onError: toast.fail('Could not revoke the key'),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    create.mutate()
  }

  const rows = (keys.data?.keys ?? []).map((key) => ({
    name: key.name,
    prefix: `${key.prefix}…`,
    scopes: key.scopes.join(', '),
    used: key.lastUsedAt ? timestamp(key.lastUsedAt) : 'never',
    state: key.revokedAt ? <Badge tone="danger">revoked</Badge> : <Badge tone="success">active</Badge>,
    action: key.revokedAt ? null : (
      <Button variant="ghost" size="sm" onClick={() => revoke.mutate(key.id)}>
        Revoke
      </Button>
    ),
  }))

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <Card padding="none">
        <Table
          emptyLabel="No keys yet"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'prefix', label: 'Key', mono: true, width: 170 },
            { key: 'scopes', label: 'Can', mono: true },
            { key: 'used', label: 'Last used', mono: true, width: 140, muted: true },
            { key: 'state', label: 'State', width: 100 },
            { key: 'action', label: '', align: 'right', width: 96 },
          ]}
          rows={rows}
        />
      </Card>

      <Card title="Create a key" description={KEY_KINDS[kind]?.describes}>
        {created ? (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <RevealedSecret value={created.key} />
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          style={{ display: 'grid', gap: 'var(--space-5)', gridTemplateColumns: '1fr auto', alignItems: 'end' }}
        >
          <Field label="Name" htmlFor="key-name" hint="Where this key will live — “production”, “staging”.">
            <Input
              id="key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="production"
              required
            />
          </Field>
          <Button type="submit" variant="secondary" loading={create.isPending}>
            Create key
          </Button>
        </form>

        <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-2)' }}>
          {KEY_KINDS.map((option, index) => (
            <Button
              key={option.label}
              size="sm"
              variant={index === kind ? 'secondary' : 'ghost'}
              onClick={() => setKind(index)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      {toast.node}
    </div>
  )
}
