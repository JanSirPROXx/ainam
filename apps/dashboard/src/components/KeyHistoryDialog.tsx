'use client'

import type { ContentVersionPage, RestoreResult } from '@ainam/schema'
import { Button, Dialog, Table } from '@ainam/ui'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { adminFetch } from '@/lib/api'
import { authorName, timestamp } from '@/lib/format'
import { mergeHistoryPages, withCursor } from '@/lib/history'
import { useToast } from '@/lib/toast'
import { LoadMore } from './LoadMore'
import { publishOutcome } from './publish-outcome'
import { VersionValue } from './VersionValue'

export interface KeyHistoryDialogProps {
  projectId: string
  contentKey: string
  locale: string
  canRestore: boolean
  onClose: () => void
  onRestored: () => Promise<unknown>
}

/**
 * What one key has said, and a way back to any of it.
 *
 * Values are shown read-only rather than loaded into the editor: choosing a
 * version and choosing to publish it are different decisions, and merging them
 * would make browsing history a write.
 */
export function KeyHistoryDialog(props: KeyHistoryDialogProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirming, setConfirming] = useState<number | null>(null)

  const history = useInfiniteQuery({
    queryKey: ['versions', props.projectId, props.contentKey, props.locale],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      adminFetch<ContentVersionPage>(
        withCursor(
          `/admin/projects/${props.projectId}/versions?key=${encodeURIComponent(props.contentKey)}&locale=${props.locale}`,
          pageParam,
        ),
      ),
    getNextPageParam: (page) => page.nextCursor,
  })

  const restore = useMutation({
    mutationFn: (version: number) =>
      adminFetch<RestoreResult>(`/admin/projects/${props.projectId}/restore`, {
        method: 'POST',
        body: JSON.stringify({ locale: props.locale, key: props.contentKey, version }),
      }),
    onSuccess: async (result) => {
      toast.show(publishOutcome(result.restored.length, result.webhook, 'Restored'))
      setConfirming(null)
      // The restore is itself a version, so this list is now one entry short.
      await queryClient.invalidateQueries({ queryKey: ['versions', props.projectId] })
      await props.onRestored()
    },
    onError: toast.fail('Could not restore'),
  })

  const { items, people } = mergeHistoryPages(history.data?.pages, (page) => page.versions)
  const rows = items.map((version) => ({
    version: `v${version.version}`,
    when: timestamp(version.createdAt),
    who: authorName(version.author, people),
    value: <VersionValue value={version.value} />,
    action: props.canRestore ? (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(version.version)}>
        Restore
      </Button>
    ) : null,
  }))

  return (
    <>
      <Dialog
        open
        width={760}
        title={props.contentKey}
        description="Every published value, newest first."
        onClose={props.onClose}
        footer={
          <Button variant="secondary" onClick={props.onClose}>
            Close
          </Button>
        }
      >
        <Table
          emptyLabel="Nothing published yet"
          columns={[
            { key: 'version', label: 'Version', mono: true, width: 88 },
            { key: 'when', label: 'When', mono: true, width: 140 },
            { key: 'who', label: 'Who', muted: true, width: 160 },
            { key: 'value', label: 'Value' },
            { key: 'action', label: '', align: 'right', width: 96 },
          ]}
          rows={rows}
        />
        <LoadMore
          hasMore={history.hasNextPage}
          loading={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        />
      </Dialog>

      {confirming !== null ? (
        <Dialog
          open
          title={`Restore ${props.contentKey} to v${confirming}?`}
          description={
            'This publishes the older value to the live site now, and replaces whatever is ' +
            'currently in the editor for this key. Both are recorded, so you can undo it.'
          }
          onClose={() => setConfirming(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button loading={restore.isPending} onClick={() => restore.mutate(confirming)}>
                Restore and publish
              </Button>
            </>
          }
        />
      ) : null}

      {toast.node}
    </>
  )
}
