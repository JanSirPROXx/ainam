'use client'

import type { AssetSummary, ImageValue, ResolvedImage } from '@ainam/schema'
import { ACCEPTED_IMAGE_FORMATS, MAX_UPLOAD_BYTES, describeBytes } from '@ainam/schema'
import { Button, Field, Input } from '@ainam/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type DragEvent, useRef, useState } from 'react'
import { adminUpload } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { AssetPicker } from './AssetPicker'

export interface ImageControlProps {
  id: string
  projectId: string
  value: ResolvedImage | ImageValue | null
  /** Whether the field declared an alt text. */
  wantsAlt: boolean
  onChange: (value: ImageValue | null) => void
}

const ACCEPT = ACCEPTED_IMAGE_FORMATS.map((format) => `image/${format}`).join(',')

function urlOf(value: ImageControlProps['value']): string | undefined {
  return value && 'url' in value ? value.url : undefined
}

/**
 * Picking, replacing and describing one image.
 *
 * The stored value is only `{ assetId, alt }` — the URL and dimensions come
 * back resolved from the server, which is why this can show the current image
 * without knowing anything about the bucket. The dashboard never talks to
 * storage.
 */
export function ImageControl({ id, projectId, value, wantsAlt, onChange }: ImageControlProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [picking, setPicking] = useState(false)

  const upload = useMutation({
    mutationFn: (file: File) =>
      adminUpload<AssetSummary>(`/admin/projects/${projectId}/assets`, file),
    onSuccess: async (asset) => {
      onChange({ assetId: asset.id, alt: value?.alt ?? '' })
      await queryClient.invalidateQueries({ queryKey: ['assets', projectId] })
    },
    onError: toast.fail('Could not upload that image'),
  })

  function accept(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    // Checked here as well as on the server, so the answer is immediate and
    // names the limit rather than arriving as a rejected request.
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.show({
        tone: 'error',
        title: 'That image is too large',
        body: `${file.name} is ${describeBytes(file.size)}. The limit is ${describeBytes(MAX_UPLOAD_BYTES)}.`,
      })
      return
    }
    upload.mutate(file)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    accept(event.dataTransfer.files)
  }

  const url = urlOf(value)
  const dimensions = value && 'width' in value ? `${value.width} × ${value.height}` : null

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `1px dashed ${dragging ? 'var(--border-strong)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)',
          display: 'flex',
          gap: 'var(--space-5)',
          alignItems: 'center',
          transition: 'border-color var(--dur-hover) var(--ease-out)',
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the dashboard
          // shows an arbitrary bucket URL, which next/image would have to be
          // configured for per deployment.
          <img
            src={url}
            alt=""
            style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
          />
        ) : (
          <div
            style={{
              width: 96,
              height: 96,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-raised)',
              font: 'var(--type-caption)',
              color: 'var(--text-faint)',
            }}
          >
            No image
          </div>
        )}

        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            {dimensions
              ? `${dimensions} · drop a file to replace it`
              : `Drop a file, or choose one. ${ACCEPTED_IMAGE_FORMATS.join(', ')}, up to ${describeBytes(MAX_UPLOAD_BYTES)}.`}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button
              variant="secondary"
              size="sm"
              loading={upload.isPending}
              onClick={() => input.current?.click()}
            >
              {url ? 'Replace' : 'Upload'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPicking(true)}>
              Choose existing
            </Button>
            {url ? (
              // Clearing the field never deletes the asset: a version from last
              // month still points at it, and rollback has to keep working.
              <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <input
          ref={input}
          id={id}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(event) => accept(event.target.files)}
        />
      </div>

      {wantsAlt && value ? (
        <Field
          label="Alt text"
          htmlFor={`${id}-alt`}
          hint="What the image shows, for someone who cannot see it."
        >
          <Input
            id={`${id}-alt`}
            value={value.alt}
            onChange={(event) => onChange({ assetId: value.assetId, alt: event.target.value })}
          />
        </Field>
      ) : null}

      {picking ? (
        <AssetPicker
          projectId={projectId}
          onClose={() => setPicking(false)}
          onPick={(asset) => {
            onChange({ assetId: asset.id, alt: value?.alt ?? '' })
            setPicking(false)
          }}
        />
      ) : null}

      {toast.node}
    </div>
  )
}
