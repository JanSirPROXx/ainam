import { describe, expect, it } from 'vitest'
import {
  decodePublishCursor,
  decodeVersionCursor,
  encodePublishCursor,
} from '../src/lib/cursor'

describe('publish cursor', () => {
  it('round-trips a position', () => {
    const at = new Date('2026-08-26T09:15:00.123Z')
    const decoded = decodePublishCursor(encodePublishCursor(at, 'pub_abc-DEF_123'))
    expect(decoded?.at.toISOString()).toBe(at.toISOString())
    expect(decoded?.publishId).toBe('pub_abc-DEF_123')
  })

  it('keeps milliseconds, because history rows are written with them', () => {
    // Truncating here would let a page skip a row published in the same second.
    const at = new Date(1787696903973)
    expect(decodePublishCursor(encodePublishCursor(at, 'pub_x'))?.at.getTime()).toBe(1787696903973)
  })

  it('rejects anything it did not issue, rather than starting over silently', () => {
    // A rejected cursor becomes a 400. Falling back to the first page would
    // repeat rows the caller has already seen and look like duplicated history.
    expect(decodePublishCursor('')).toBeUndefined()
    expect(decodePublishCursor('nonsense')).toBeUndefined()
    expect(decodePublishCursor('.pub_x')).toBeUndefined()
    expect(decodePublishCursor('123.')).toBeUndefined()
    expect(decodePublishCursor('abc.pub_x')).toBeUndefined()
  })
})

describe('version cursor', () => {
  it('accepts a positive version and nothing else', () => {
    expect(decodeVersionCursor('7')).toBe(7)
    expect(decodeVersionCursor('0')).toBeUndefined()
    expect(decodeVersionCursor('-3')).toBeUndefined()
    expect(decodeVersionCursor('1.5')).toBeUndefined()
    expect(decodeVersionCursor('v7')).toBeUndefined()
  })
})
