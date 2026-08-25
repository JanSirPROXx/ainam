'use client'

import type { ProjectSummary } from '@ainam/schema'
import { Button, Card, Field, Input } from '@ainam/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { adminFetch } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { RevealedSecret } from './RevealedSecret'

/**
 * The three settings that decide whether publishing reaches the site.
 *
 * Grouped rather than spread across screens because they fail together: a
 * webhook URL with no secret, or a secret the site does not have, both surface
 * as "I published and nothing happened".
 */
export function ProjectSettings({ project }: { project: ProjectSummary }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState(project.name)
  const [webhookUrl, setWebhookUrl] = useState(project.webhookUrl ?? '')
  const [previewUrl, setPreviewUrl] = useState(project.previewUrl ?? '')
  const [secret, setSecret] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['project', project.id] })

  const save = useMutation({
    mutationFn: () =>
      adminFetch<ProjectSummary>(`/admin/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, webhookUrl, previewUrl }),
      }),
    onSuccess: async () => {
      toast.show({ tone: 'success', title: 'Settings saved' })
      await refresh()
    },
    onError: toast.fail('Could not save settings'),
  })

  const rotate = useMutation({
    mutationFn: () =>
      adminFetch<{ webhookSecret: string }>(`/admin/projects/${project.id}/webhook-secret`, {
        method: 'POST',
      }),
    onSuccess: (result) => setSecret(result.webhookSecret),
    onError: toast.fail('Could not create a secret'),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <Card title="Project" description="Where AINAM reaches your site.">
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <Field label="Name" htmlFor="project-name">
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field
            label="Webhook URL"
            htmlFor="webhook-url"
            hint="Called after every publish so the site refreshes without a deploy. Usually /api/ainam/revalidate."
          >
            <Input
              id="webhook-url"
              type="url"
              value={webhookUrl}
              placeholder="https://your-site.example/api/ainam/revalidate"
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </Field>
          <Field
            label="Preview URL"
            htmlFor="preview-url"
            hint="Where the Preview button sends you. The route on your site that calls createPreviewHandler."
          >
            <Input
              id="preview-url"
              type="url"
              value={previewUrl}
              placeholder="https://your-site.example/api/ainam/preview"
              onChange={(e) => setPreviewUrl(e.target.value)}
            />
          </Field>
          <div>
            <Button type="submit" loading={save.isPending}>
              Save settings
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Webhook secret"
        description="Signs publish notifications and preview links. Your site reads it as AINAM_WEBHOOK_SECRET."
      >
        {secret ? (
          <RevealedSecret value={secret} />
        ) : (
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            Creating a new secret stops the current one working immediately. Publishes will reach
            your site and be rejected until you put the new one in its environment and redeploy.
          </p>
        )}
        <div style={{ marginTop: 'var(--space-5)' }}>
          <Button variant="danger" loading={rotate.isPending} onClick={() => rotate.mutate()}>
            Create a new secret
          </Button>
        </div>
      </Card>

      {toast.node}
    </div>
  )
}
