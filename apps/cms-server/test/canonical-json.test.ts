import { describe, expect, it } from 'vitest'
import { canonicalize, documentsMatch } from '../src/lib/canonical-json'

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

  it('distinguishes null from an absent value', () => {
    expect(canonicalize(null)).toBe('null')
    expect(documentsMatch(null, '')).toBe(false)
    expect(documentsMatch({ a: undefined }, {})).toBe(true)
  })
})
