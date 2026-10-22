'use client'

import type { CreateProjectRequest, ProjectSummary } from '@ainam/schema'
import { Button, Card, Field, Input } from '@ainam/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { organization, refreshOrganizations } from '@/lib/auth-client'
import { useToast } from '@/lib/toast'

/**
 * Creates a project, and with it the organisation that holds it.
 *
 * Only a name is asked for. Locales are declared in the website's code and set
 * by `ainam push`, so a field for them here would be a second source of truth.
 */
export function NewProjectForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')

  const create = useMutation({
    mutationFn: (body: CreateProjectRequest) =>
      adminFetch<ProjectSummary>('/admin/projects', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async (project) => {
      // The new organisation becomes the active one, or the project list would
      // stay filtered to a different client and the project just created would
      // not be on it.
      refreshOrganizations()
      await organization.setActive({ organizationId: project.organizationId })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      router.push(`/projects/${project.id}`)
    },
    onError: toast.fail('Could not create the project'),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    create.mutate({ name })
  }

  return (
    <>
      <Card
        title="New project"
        description="One project per website. It gets an organisation of its own, so you can invite its editors without showing them your other sites."
      >
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <Field label="Name" htmlFor="project-name" hint="Usually the site or the client, like Acme web.">
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
              autoFocus
            />
          </Field>
          <div>
            <Button type="submit" loading={create.isPending} disabled={name.trim() === ''}>
              Create project
            </Button>
          </div>
        </form>
      </Card>
      {toast.node}
    </>
  )
}
