'use client'

import type { ContentValue, Field } from '@ainam/schema'
import { ListField } from './ListField'
import { ScalarControl } from './ScalarControl'

export interface FieldControlProps {
  id: string
  projectId: string
  field: Field
  value: ContentValue
  onChange: (value: ContentValue) => void
}

/**
 * The control for one field, whatever kind it is.
 *
 * Every kind in the schema has one — a field that rendered a disabled note
 * would look like lost content to the person editing, which is why the schema
 * only admits kinds the editor can actually edit.
 */
export function FieldControl({ id, projectId, field, value, onChange }: FieldControlProps) {
  if (field.type === 'list') {
    return (
      <ListField id={id} projectId={projectId} field={field} value={value} onChange={onChange} />
    )
  }

  return (
    <ScalarControl id={id} projectId={projectId} field={field} value={value} onChange={onChange} />
  )
}
