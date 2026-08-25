'use client'

import type { ContentValue, EditorEntry } from '@ainam/schema'
import { Badge, Button, Card, Field } from '@ainam/ui'
import { FieldControl } from './FieldControl'

export interface EntryCardProps {
  entry: EditorEntry
  value: ContentValue
  onChange: (value: ContentValue) => void
  onOpenHistory: () => void
}

/**
 * One editable key.
 *
 * The content key is shown in mono under the control, because it is what a
 * developer greps for when the person editing says "the second headline" — and
 * it is the only address the two of them share.
 */
export function EntryCard({ entry, value, onChange, onOpenHistory }: EntryCardProps) {
  return (
    <Card padding="md">
      <Field label={entry.field.label} hint={entry.field.description} htmlFor={entry.key}>
        <FieldControl id={entry.key} field={entry.field} value={value} onChange={onChange} />
      </Field>
      <div
        style={{
          marginTop: 'var(--space-3)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'center',
        }}
      >
        <code style={{ font: 'var(--type-code)', color: 'var(--text-faint)' }}>{entry.key}</code>
        {entry.state === 'unpublished' ? <Badge tone="warning">unpublished</Badge> : null}
        <Button variant="ghost" size="sm" style={{ marginLeft: 'auto' }} onClick={onOpenHistory}>
          History
        </Button>
      </div>
    </Card>
  )
}
