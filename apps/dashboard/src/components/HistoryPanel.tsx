'use client'

import type { ProjectSummary, PublishEventPage, RestoreResult } from '@ainam/schema'
import { hasPermission } from '@ainam/schema'
import { Button, Card, Dialog, Table } from '@ainam/ui'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { adminFetch } from '@/lib/api'
import { authorName, timestamp } from '@/lib/format'
import { mergeHistoryPages, withCursor } from '@/lib/history'
import { count } from '@/lib/plural'
import { useToast } from '@/lib/toast'
import { LoadMore } from './LoadMore'
import { publishOutcome } from './publish-outcome'

/**
 * Every publish, and a way to undo one.
 *
 * Publishes rather than individual edits: a person remembers "that change I
 * made this morning", not which of six keys carried it, and undoing half of a
 * change would leave the page saying something nobody ever wrote.
 */
export function HistoryPanel({
  projectId,
  project,
}: {
  projectId: string
  project: ProjectSummary
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirming, setConfirming] = useState<{ id: string; keys: number } | null>(null)
  const canRevert = hasPermission(project.role, 'content:restore')

  const publishes = useInfiniteQuery({
    queryKey: ['publishes', projectId, project.defaultLocale],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      adminFetch<PublishEventPage>(
        withCursor(
          `/admin/projects/${projectId}/publishes?locale=${project.defaultLocale}`,
          pageParam,
        ),
      ),
    getNextPageParam: (page) => page.nextCursor,
  })

  const revert = useMutation({
    mutationFn: (publishId: string) =>
      adminFetch<RestoreResult>(`/admin/projects/${projectId}/revert`, {
        method: 'POST',
        body: JSON.stringify({ publishId }),
      }),
    onSuccess: async (result) => {
      const outcome = publishOutcome(result.restored.length, result.webhook, 'Reverted')
      toast.show(
        result.skipped.length > 0
          ? {
              ...outcome,
              body: `${count(result.skipped.length, 'key')} had no earlier version and were left as they are: ${result.skipped.join(', ')}.`,
            }
          : outcome,
      )
      setConfirming(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['publishes', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['content', projectId] }),
      ])
    },
    onError: toast.fail('Could not revert'),
  })

  const { items, people } = mergeHistoryPages(publishes.data?.pages, (page) => page.publishes)
  const rows = items.map((publish) => ({
    when: timestamp(publish.publishedAt),
    who: authorName(publish.author, people),
    keys: publish.keys.join(', '),
    action: canRevert ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming({ id: publish.publishId, keys: publish.keys.length })}
      >
        Revert
      </Button>
    ) : null,
  }))

  return (
    <Card padding="none">
      <Table
        emptyLabel="Nothing has been published yet"
        columns={[
          { key: 'when', label: 'When', mono: true, width: 150 },
          { key: 'who', label: 'Who', muted: true, width: 180 },
          { key: 'keys', label: 'Keys', mono: true },
          { key: 'action', label: '', align: 'right', width: 96 },
        ]}
        rows={rows}
      />

      <LoadMore
        hasMore={publishes.hasNextPage}
        loading={publishes.isFetchingNextPage}
        onClick={() => void publishes.fetchNextPage()}
      />

      {confirming ? (
        <Dialog
          open
          title="Revert this publish?"
          description={
            `${count(confirming.keys, 'key')} go back to what they said before it, on the live ` +
            'site and in the editor. Anything published after it that touched the same keys is ' +
            'replaced too. This is recorded as a new publish, so you can undo it.'
          }
          onClose={() => setConfirming(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={revert.isPending}
                onClick={() => revert.mutate(confirming.id)}
              >
                Revert and publish
              </Button>
            </>
          }
        />
      ) : null}

      {toast.node}
    </Card>
  )
}
