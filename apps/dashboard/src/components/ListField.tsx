'use client'

import type { ContentValue, ListField as ListFieldType, ScalarValue } from '@ainam/schema'
import { Button, Card, Field } from '@ainam/ui'
import { useState } from 'react'
import { ScalarControl } from './ScalarControl'

type Item = Record<string, ScalarValue>

export interface ListFieldProps {
  id: string
  projectId: string
  field: ListFieldType
  value: ContentValue
  onChange: (value: ContentValue) => void
}

function itemsOf(value: ContentValue): Item[] {
  return Array.isArray(value) ? (value as Item[]) : []
}

/** A new row starts from the field's declared defaults, never from nothing. */
function blankItem(field: ListFieldType): Item {
  return Object.fromEntries(
    Object.entries(field.fields).map(([name, item]) => [
      name,
      item.type === 'image' ? null : (item.default as ScalarValue),
    ]),
  )
}

/**
 * A repeatable group of fields.
 *
 * Add, remove and reorder, and nothing else: the MVP list holds scalars only,
 * so there is no nesting to navigate and no drag surface to get wrong on a
 * touch screen. Moving a row is two buttons rather than a drag, which also
 * works from a keyboard.
 */
export function ListField({ id, projectId, field, value, onChange }: ListFieldProps) {
  const items = itemsOf(value)
  // Rows are keyed by position, which is only safe while positions hold. Moving
  // or removing one bumps this, so React remounts the rows instead of reusing
  // the DOM node that was at that index — otherwise the text stays put and only
  // the labels appear to move.
  const [arrangement, setArrangement] = useState(0)

  const replace = (next: Item[], rearranged = false) => {
    if (rearranged) setArrangement((current) => current + 1)
    onChange(next as ContentValue)
  }
  const update = (index: number, name: string, entry: ContentValue) =>
    replace(items.map((item, at) => (at === index ? { ...item, [name]: entry as ScalarValue } : item)))

  const move = (index: number, by: number) => {
    const to = index + by
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [moved] = next.splice(index, 1)
    if (moved) next.splice(to, 0, moved)
    replace(next, true)
  }

  const atLimit = field.maxItems !== undefined && items.length >= field.maxItems

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      {items.map((item, index) => (
        // Safe because `arrangement` changes whenever a position does, so React
        // never reuses a row across a move — see the comment on that state.
        // oxlint-disable-next-line react/no-array-index-key
        <Card key={`${arrangement}-${index}`} padding="sm">
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {Object.entries(field.fields).map(([name, itemField]) => (
              <Field key={name} label={itemField.label} htmlFor={`${id}-${index}-${name}`}>
                <ScalarControl
                  id={`${id}-${index}-${name}`}
                  projectId={projectId}
                  field={itemField}
                  value={item[name] ?? null}
                  onChange={(entry) => update(index, name, entry)}
                />
              </Field>
            ))}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Move up
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                Move down
              </Button>
              <Button
                variant="ghost"
                size="sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => replace(items.filter((_, at) => at !== index), true)}
              >
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <div>
        <Button
          variant="secondary"
          size="sm"
          disabled={atLimit}
          onClick={() => replace([...items, blankItem(field)])}
        >
          {atLimit ? `At the limit of ${field.maxItems}` : 'Add item'}
        </Button>
      </div>
    </div>
  )
}
