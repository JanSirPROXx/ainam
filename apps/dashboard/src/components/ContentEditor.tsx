'use client'

import type {
  EditorView,
  PreviewLink,
  ProjectSummary,
  PublishResult,
  SaveDraftResult,
} from '@ainam/schema'
import { hasPermission } from '@ainam/schema'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { adminFetch } from '@/lib/api'
import { type Draft, initialDraft, unsavedEntries } from '@/lib/editor-state'
import { count } from '@/lib/plural'
import { useToast } from '@/lib/toast'
import { EditorToolbar } from './EditorToolbar'
import { EntryCard } from './EntryCard'
import { KeyHistoryDialog } from './KeyHistoryDialog'
import { publishOutcome } from './publish-outcome'

/**
 * The editing surface for one locale.
 *
 * Edits are held locally until Save, so a keystroke is not a write. Each entry
 * carries the version it was loaded at, which is what lets the server refuse a
 * write that would overwrite someone else's.
 */
export function ContentEditor({
  projectId,
  view,
  project,
}: {
  projectId: string
  view: EditorView
  project: ProjectSummary
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => initialDraft(view))
  const [historyKey, setHistoryKey] = useState<string | null>(null)

  // A publish or a restore moves both the editor and the history, so both are
  // invalidated together rather than each caller remembering the other.
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['content', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['publishes', projectId] }),
    ])
  }
  const dirty = unsavedEntries(view, draft)

  const save = useMutation({
    mutationFn: () =>
      adminFetch<SaveDraftResult>(`/admin/projects/${projectId}/content`, {
        method: 'PATCH',
        body: JSON.stringify({
          locale: view.locale,
          entries: dirty.map((entry) => ({
            key: entry.key,
            value: draft[entry.key] ?? null,
            expectedVersion: entry.draft?.version ?? 0,
          })),
        }),
      }),
    onSuccess: async (result) => {
      toast.show({ tone: 'success', title: `Saved ${count(result.saved.length, 'change')}` })
      await refresh()
    },
    onError: toast.fail('Could not save'),
  })

  const publish = useMutation({
    mutationFn: () =>
      adminFetch<PublishResult>(`/admin/projects/${projectId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ locale: view.locale }),
      }),
    onSuccess: async (result) => {
      toast.show(publishOutcome(result.published.length, result.webhook))
      await refresh()
    },
    onError: toast.fail('Could not publish'),
  })

  const preview = useMutation({
    // Opened before the request, not after: a browser blocks a tab opened from
    // an already-resolved promise, and the block looks like a dead button.
    mutationFn: async () => {
      const tab = window.open('', '_blank')
      try {
        const link = await adminFetch<PreviewLink>(
          `/admin/projects/${projectId}/preview-link?locale=${view.locale}`,
        )
        if (tab) tab.location.href = link.url
        return link
      } catch (error) {
        tab?.close()
        throw error
      }
    },
    onError: toast.fail('Could not open a preview'),
  })

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <EditorToolbar
        project={project}
        unpublishedCount={view.unpublishedCount}
        dirtyCount={dirty.length}
        saving={save.isPending}
        publishing={publish.isPending}
        previewing={preview.isPending}
        onSave={() => save.mutate()}
        onPublish={() => publish.mutate()}
        onPreview={() => preview.mutate()}
      />

      {view.entries.map((entry) => (
        <EntryCard
          key={entry.key}
          projectId={projectId}
          entry={entry}
          value={draft[entry.key] ?? null}
          onChange={(value) => setDraft((current) => ({ ...current, [entry.key]: value }))}
          onOpenHistory={() => setHistoryKey(entry.key)}
        />
      ))}

      {historyKey ? (
        <KeyHistoryDialog
          projectId={projectId}
          contentKey={historyKey}
          locale={view.locale}
          canRestore={hasPermission(project.role, 'content:restore')}
          onClose={() => setHistoryKey(null)}
          onRestored={refresh}
        />
      ) : null}

      {toast.node}
    </div>
  )
}
