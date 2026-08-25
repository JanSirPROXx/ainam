'use client'

import type { AinamRole } from '@ainam/schema'
import { AINAM_ROLES, ROLE_DESCRIPTIONS } from '@ainam/schema'
import { Badge, Button, Card, Field, Input, Select, Table } from '@ainam/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { organization } from '@/lib/auth-client'
import { useToast } from '@/lib/toast'
import { InvitationLink } from './InvitationLink'

const roleOptions = AINAM_ROLES.map((role) => ({
  value: role,
  label: ROLE_DESCRIPTIONS[role].name,
}))

/**
 * Who can edit this client's site.
 *
 * The whole point of the milestone: an agency hands editing to its client
 * without handing over the login it uses for every other client. Talks to
 * Better Auth's organisation endpoints directly — they already model members
 * and invitations, and a second set of routes over the same tables would be two
 * places to get authorisation wrong.
 */
export function PeoplePanel({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AinamRole>('editor')
  const [invitationId, setInvitationId] = useState<string | null>(null)

  const members = useQuery({
    queryKey: ['members', organizationId],
    queryFn: async () => {
      const result = await organization.listMembers({ query: { organizationId } })
      if (result.error) throw new Error(result.error.message ?? 'Could not load members.')
      return result.data.members
    },
  })

  const invite = useMutation({
    mutationFn: async () => {
      const result = await organization.inviteMember({ email, role, organizationId })
      if (result.error) throw new Error(result.error.message ?? 'Could not send the invitation.')
      return result.data
    },
    onSuccess: async (invitation) => {
      // Shown rather than only sent: the default instance has no mail server,
      // and an invitation nobody can deliver is an invitation nobody accepts.
      setInvitationId(invitation.id)
      setEmail('')
      toast.show({ tone: 'success', title: `Invited ${invitation.email}` })
      await queryClient.invalidateQueries({ queryKey: ['members', organizationId] })
    },
    onError: toast.fail('Could not invite'),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    invite.mutate()
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <Card padding="none">
        <Table
          emptyLabel="Nobody yet"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email', muted: true },
            { key: 'role', label: 'Role', align: 'right', width: 120 },
          ]}
          rows={(members.data ?? []).map((member) => ({
            name: member.user.name || '—',
            email: member.user.email,
            role: <Badge tone="neutral">{member.role}</Badge>,
          }))}
        />
      </Card>

      <Card title="Invite someone" description={ROLE_DESCRIPTIONS[role].describes}>
        <form
          onSubmit={onSubmit}
          style={{ display: 'grid', gap: 'var(--space-5)', gridTemplateColumns: '1fr 160px auto', alignItems: 'end' }}
        >
          <Field label="Email" htmlFor="invite-email">
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="editor@client.example"
              required
            />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <Select
              id="invite-role"
              options={roleOptions}
              value={role}
              onChange={(event) => setRole(event.target.value as AinamRole)}
            />
          </Field>
          <Button type="submit" loading={invite.isPending}>
            Send invite
          </Button>
        </form>

        {invitationId ? <InvitationLink invitationId={invitationId} /> : null}
      </Card>

      {toast.node}
    </div>
  )
}
