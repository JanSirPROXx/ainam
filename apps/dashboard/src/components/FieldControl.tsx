'use client'

import type { ContentValue, Field } from '@ainam/schema'
import { Input, Switch, Textarea } from '@ainam/ui'

export interface FieldControlProps {
  field: Field
  value: ContentValue
  onChange: (value: ContentValue) => void
  id: string
}

/**
 * Renders the control for one field kind.
 *
 * Kinds without an editor yet render a disabled note rather than nothing: a
 * field that silently disappears looks like lost content to the person editing.
 */
export function FieldControl({ field, value, onChange, id }: FieldControlProps) {
  switch (field.type) {
    case 'text':
      return field.multiline ? (
        <Textarea id={id} rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      )

    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={String(value ?? 0)}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
      )

    case 'boolean':
      // No label of its own: the surrounding Field already renders one, and two
      // copies of the same sentence read as a rendering bug.
      return <Switch id={id} checked={value === true} onChange={onChange} />

    default:
      return (
        <Input
          id={id}
          disabled
          value={`No editor for "${field.type}" yet — the value is unchanged`}
        />
      )
  }
}
