'use client'

import { Button } from '@ainam/ui'

/**
 * The rest of a paged list.
 *
 * Rendered rather than the page silently ending: a history that stops at twenty
 * rows with nothing saying so reads as "that is everything that ever happened",
 * which is the one claim a history must never make falsely.
 */
export function LoadMore({
  hasMore,
  loading,
  onClick,
}: {
  hasMore: boolean
  loading: boolean
  onClick: () => void
}) {
  if (!hasMore) return null

  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
      <Button variant="ghost" size="sm" loading={loading} onClick={onClick}>
        Load older
      </Button>
    </div>
  )
}
