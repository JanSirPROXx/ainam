import type { Field } from '@ainam/schema'
import { screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FieldControl } from '@/components/FieldControl'
import { renderWithProviders } from './render'

// TipTap drives a real ProseMirror instance, which needs more of a DOM than a
// control test should care about. The rich-text case is covered by the renderer
// parity tests in @ainam/core and @ainam/next.
//
// `createElement` rather than JSX: vitest hoists a mock factory above the JSX
// transform, so JSX inside one never gets compiled.
vi.mock('@/components/RichTextEditor', () => ({
  RichTextEditor: ({ id }: { id: string }) =>
    createElement('div', { 'data-testid': 'richtext', id }),
}))

const FIELDS: Array<[string, Field]> = [
  ['text', { type: 'text', label: 'Title', required: true, multiline: false, default: '' }],
  ['multiline text', { type: 'text', label: 'Subtitle', required: false, multiline: true, default: '' }],
  ['number', { type: 'number', label: 'Seats', required: false, default: 3 }],
  ['boolean', { type: 'boolean', label: 'Show pricing', required: false, default: true }],
  ['richText', { type: 'richText', label: 'About', required: false, default: '' }],
  ['image', { type: 'image', label: 'Hero', required: false, alt: true }],
  [
    'list',
    {
      type: 'list',
      label: 'Logos',
      required: false,
      default: [],
      fields: { name: { type: 'text', label: 'Name', required: true, multiline: false, default: '' } },
    },
  ],
]

function renderField(field: Field, value: unknown = null) {
  return renderWithProviders(
    <FieldControl
      id="field"
      projectId="proj_test"
      field={field}
      value={value as never}
      onChange={() => undefined}
    />,
  )
}

describe('FieldControl', () => {
  it.each(FIELDS)('renders a real control for a %s field', (_name, field) => {
    // The property that matters: every kind the schema admits has something to
    // edit it with. A kind that fell through to nothing would look like lost
    // content to the person editing.
    const { container } = renderField(field)
    expect(container.querySelector('input, textarea, select, button, [data-testid]')).not.toBeNull()
  })

  it('labels a boolean field once, not twice', () => {
    // It rendered its label from the control as well as from the surrounding
    // Field, and two copies of the same sentence read as a rendering bug.
    renderField({ type: 'boolean', label: 'Show pricing', required: false, default: true }, true)
    expect(screen.queryAllByText('Show pricing')).toHaveLength(0)
  })

  it('states the upload limits before anyone picks a file', () => {
    renderField({ type: 'image', label: 'Hero', required: false, alt: true })
    expect(screen.getByText(/up to 20 MB/)).toBeDefined()
    expect(screen.getByText(/jpeg, png, webp, avif, gif/)).toBeDefined()
  })

  it('offers a way to add a row to an empty list', () => {
    renderField(FIELDS[6]![1], [])
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDefined()
  })
})
