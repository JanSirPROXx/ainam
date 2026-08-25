'use client'

import type { ContentValue, EditorView, PublishResult, SaveDraftResult } from '@ainam/schema'
import { Badge, Button, Card, Field, Toast } from '@ainam/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminApiError, adminFetch } from '@/lib/api'
import { FieldControl } from './FieldControl'

type Draft = Record<string, ContentValue>

function initialDraft(view: EditorView): Draft {
  return Object.fromEntries(view.entries.map((e) => [e.key, e.draft?.value ?? null]))
}

/**
 * The editing surface for one locale.
 *
 * Edits are held locally until Save, so a keystroke is not a write. Each entry
 * carries the version it was loaded at, which is what lets the server refuse a
 * write that would overwrite someone else's.
 */
export function ContentEditor({ projectId, view }: { projectId: string; view: EditorView }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft>(() => initialDraft(view))
  // `| undefined` explicitly: exactOptionalPropertyTypes distinguishes an absent
  // property from one set to undefined, and this is assigned from an expression
  // that yields undefined.
  const [toast, setToast] = useState<
    { tone: 'success' | 'error'; title: string; body?: string | undefined } | null
  >(null)

  const dirty = view.entries.filter((e) => JSON.stringify(draft[e.key]) !== JSON.stringify(e.draft?.value ?? null))

  const save = useMutation({
    mutationFn: () =>
      adminFetch<SaveDraftResult>(`/admin/projects/${projectId}/content`, {
        method: 'PATCH',
        body: JSON.stringify({
          locale: view.locale,
          entries: dirty.map((e) => ({
            key: e.key,
            value: draft[e.key] ?? null,
            expectedVersion: e.draft?.version ?? 0,
          })),
        }),
      }),
    onSuccess: async (result) => {
      setToast({ tone: 'success', title: `Saved ${result.saved.length} changes` })
      await queryClient.invalidateQueries({ queryKey: ['content', projectId] })
    },
    onError: (error: AdminApiError) =>
      setToast({
        tone: 'error',
        title: error.code === 'conflict' ? 'Someone else edited this' : 'Could not save',
        body: error.message,
      }),
  })

  const publish = useMutation({
    mutationFn: () =>
      adminFetch<PublishResult>(`/admin/projects/${projectId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ locale: view.locale }),
      }),
    onSuccess: async (result) => {
      setToast({
        tone: result.webhook === 'failed' ? 'error' : 'success',
        title: `Published ${result.published.length} keys`,
        // Named plainly: "published but the page still shows the old text" is
        // the most confusing thing that can happen to someone editing a site.
        body:
          result.webhook === 'failed'
            ? 'The site was not reachable, so it may still show the previous version.'
            : result.webhook === 'not-configured'
              ? 'No webhook is configured, so the site refreshes on its next build.'
              : undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['content', projectId] })
    },
    onError: (error: AdminApiError) => setToast({ tone: 'error', title: 'Could not publish', body: error.message }),
  })

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        <Badge tone={view.unpublishedCount > 0 ? 'warning' : 'success'} dot>
          {view.unpublishedCount > 0 ? `${view.unpublishedCount} unpublished` : 'Everything published'}
        </Badge>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-3)' }}>
          <Button
            variant="secondary"
            disabled={dirty.length === 0}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {dirty.length > 0 ? `Save ${dirty.length} changes` : 'Save'}
          </Button>
          <Button
            disabled={view.unpublishedCount === 0 || dirty.length > 0}
            loading={publish.isPending}
            onClick={() => publish.mutate()}
          >
            Publish
          </Button>
        </div>
      </div>

      {view.entries.map((entry) => (
        <Card key={entry.key} padding="md">
          <Field label={entry.field.label} hint={entry.field.description} htmlFor={entry.key}>
            <FieldControl
              id={entry.key}
              field={entry.field}
              value={draft[entry.key] ?? null}
              onChange={(value) => setDraft((d) => ({ ...d, [entry.key]: value }))}
            />
          </Field>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-3)' }}>
            <code style={{ font: 'var(--type-code)', color: 'var(--text-faint)' }}>{entry.key}</code>
            {entry.state === 'unpublished' ? <Badge tone="warning">unpublished</Badge> : null}
          </div>
        </Card>
      ))}

      {toast ? (
        <Toast
          tone={toast.tone}
          title={toast.title}
          description={toast.body}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  )
}
