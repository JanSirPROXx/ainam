import type { EditorView, Field } from '@ainam/schema'
import { describe, expect, it } from 'vitest'
import { initialDraft, unsavedEntries } from '@/lib/editor-state'

const richText: Field = { type: 'richText', label: 'About', required: false, default: '' }
const text: Field = { type: 'text', label: 'Title', required: true, multiline: false, default: '' }

function viewWith(key: string, field: Field, value: unknown): EditorView {
  return {
    locale: 'en',
    unpublishedCount: 0,
    entries: [
      {
        key,
        field,
        draft: {
          value: value as never,
          version: 1,
          updatedAt: '2026-08-26T00:00:00.000Z',
          updatedBy: { kind: 'user', id: 'usr_1' },
        },
        published: null,
        state: 'never-published',
      },
    ],
  }
}

// What TipTap emits, and what the same document looks like after Postgres has
// normalised its keys — which it does at every depth, not just the top.
const fromEditor = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi', marks: [{ type: 'bold' }] }] }],
}
const fromDatabase = {
  type: 'doc',
  content: [{ content: [{ text: 'Hi', type: 'text', marks: [{ type: 'bold' }] }], type: 'paragraph' }],
}

describe('unsavedEntries', () => {
  it('reports nothing unsaved when only the key order changed', () => {
    // The defect this guards, and it blocked a whole milestone: after saving
    // rich text the editor stayed dirty forever, and Publish is disabled while
    // anything is unsaved — so the edit could never reach the site.
    const view = viewWith('home/about/body', richText, fromDatabase)
    expect(unsavedEntries(view, { 'home/about/body': fromEditor as never })).toEqual([])
  })

  it('still reports a real change', () => {
    const view = viewWith('home/about/body', richText, fromDatabase)
    const edited = { ...fromEditor, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Changed' }] }] }
    expect(unsavedEntries(view, { 'home/about/body': edited as never })).toHaveLength(1)
  })

  it('treats an absent local value as empty rather than as a change', () => {
    const view = viewWith('home/hero/title', text, null)
    expect(unsavedEntries(view, {})).toEqual([])
  })

  it('reports a scalar edit', () => {
    const view = viewWith('home/hero/title', text, 'Before')
    expect(unsavedEntries(view, { 'home/hero/title': 'After' })).toHaveLength(1)
  })
})

describe('initialDraft', () => {
  it('carries every key in the schema, including ones with no value yet', () => {
    // An image nobody has uploaded is null, not missing — a missing key would
    // make the control render as if the field did not exist.
    const view = viewWith('home/hero/image', { type: 'image', label: 'Hero', required: false, alt: true }, null)
    expect(initialDraft(view)).toEqual({ 'home/hero/image': null })
  })
})
