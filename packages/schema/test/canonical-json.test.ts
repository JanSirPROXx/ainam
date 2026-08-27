import { describe, expect, it } from 'vitest'
import { canonicalize, documentsMatch } from '../src/canonical-json'

describe('documentsMatch', () => {
  it('ignores the key order JSONB does not preserve', () => {
    // The bug this guards: a publish comparing raw JSON.stringify output writes
    // a history row on every publish, whether or not anything changed.
    expect(documentsMatch({ assetId: 'a', alt: 'b' }, { alt: 'b', assetId: 'a' })).toBe(true)
    expect(documentsMatch({ assetId: 'a', alt: 'b' }, { assetId: 'a', alt: 'c' })).toBe(false)
  })

  it('keeps array order, which is content and not an implementation detail', () => {
    expect(documentsMatch([{ a: 1 }, { a: 2 }], [{ a: 2 }, { a: 1 }])).toBe(false)
  })

  it('sees a rich-text document through the key order JSONB gave it', () => {
    // The exact shape that broke the editor: Postgres normalises keys inside
    // the nested text node, so TipTap's {type,text,marks} comes back as
    // {text,type,marks}. Comparing the raw strings left the editor permanently
    // dirty after a save, with Publish disabled and the edit unpublishable.
    const fromEditor = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi', marks: [{ type: 'bold' }] }] }],
    }
    const fromDatabase = {
      type: 'doc',
      content: [{ content: [{ text: 'Hi', type: 'text', marks: [{ type: 'bold' }] }], type: 'paragraph' }],
    }
    expect(documentsMatch(fromEditor, fromDatabase)).toBe(true)
    expect(JSON.stringify(fromEditor) === JSON.stringify(fromDatabase)).toBe(false)
  })

  it('distinguishes null from an absent value', () => {
    expect(canonicalize(null)).toBe('null')
    expect(documentsMatch(null, '')).toBe(false)
    expect(documentsMatch({ a: undefined }, {})).toBe(true)
  })
})
