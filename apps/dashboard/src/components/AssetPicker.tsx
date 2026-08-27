'use client'

import type { AssetPage, AssetSummary } from '@ainam/schema'
import { describeBytes } from '@ainam/schema'
import { Button, Dialog, EmptyState } from '@ainam/ui'
import { useQuery } from '@tanstack/react-query'
import { adminFetch } from '@/lib/api'

export interface AssetPickerProps {
  projectId: string
  onPick: (asset: AssetSummary) => void
  onClose: () => void
}

/**
 * Reuse an image already in the project.
 *
 * Without it a project accumulates a dozen copies of the same logo, one per
 * field that shows it — and every copy is a separate object to pay for and a
 * separate thing to update when the logo changes.
 */
export function AssetPicker({ projectId, onPick, onClose }: AssetPickerProps) {
  const assets = useQuery({
    queryKey: ['assets', projectId],
    queryFn: () => adminFetch<AssetPage>(`/admin/projects/${projectId}/assets`),
  })

  const items = assets.data?.assets ?? []

  return (
    <Dialog
      open
      width={720}
      title="Choose an image"
      description={
        assets.data
          ? `${items.length} uploaded · ${describeBytes(assets.data.storedBytes)} stored`
          : undefined
      }
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {assets.isSuccess && items.length === 0 ? (
        <EmptyState
          title="Nothing uploaded yet"
          description="Drop a file onto the image field to add the first one."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {items.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onPick(asset)}
              title={`${asset.filename} · ${asset.width} × ${asset.height}`}
              style={{
                padding: 0,
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-raised)',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- an
                  arbitrary bucket URL, which next/image would need configuring
                  for on every deployment. */}
              <img
                src={asset.url}
                alt={asset.filename}
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}
    </Dialog>
  )
}
