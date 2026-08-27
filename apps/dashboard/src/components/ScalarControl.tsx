'use client'

import type { ContentValue, ImageValue, ResolvedImage, RichTextValue, ScalarField } from '@ainam/schema'
import { Input, Switch, Textarea } from '@ainam/ui'
import { ImageControl } from './ImageControl'
import { RichTextEditor } from './RichTextEditor'

export interface ScalarControlProps {
  id: string
  projectId: string
  field: ScalarField
  value: ContentValue
  onChange: (value: ContentValue) => void
}

/**
 * The control for one scalar field.
 *
 * Separate from `FieldControl` because a list row holds scalars too, and a list
 * of lists is not something the schema allows — so this is the whole set of
 * controls a row can contain.
 */
export function ScalarControl({ id, projectId, field, value, onChange }: ScalarControlProps) {
  switch (field.type) {
    case 'text':
      return field.multiline ? (
        <Textarea
          id={id}
          rows={3}
          value={String(value ?? '')}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={String(value ?? '')}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      )

    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={String(value ?? 0)}
          min={field.min}
          max={field.max}
          onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
        />
      )

    case 'boolean':
      // No label of its own: the surrounding Field already renders one, and two
      // copies of the same sentence read as a rendering bug.
      return <Switch id={id} checked={value === true} onChange={onChange} />

    case 'richText':
      return (
        <RichTextEditor
          id={id}
          value={(value as RichTextValue | null) ?? null}
          onChange={onChange}
        />
      )

    case 'image':
      return (
        <ImageControl
          id={id}
          projectId={projectId}
          value={(value as ResolvedImage | ImageValue | null) ?? null}
          wantsAlt={field.alt}
          onChange={(next: ImageValue | null) => onChange(next)}
        />
      )
  }
}
