import { describe, expect, it } from 'vitest'
import { generateApiKey, hashApiKey, hashesMatch } from '../src/lib/api-key'

describe('generateApiKey', () => {
  it('marks the key as ours, so it is recognisable in a .env and to a secret scanner', () => {
    expect(generateApiKey().plaintext).toMatch(/^ainam_sk_[A-Za-z0-9_-]{43}$/)
  })

  it('never returns the same key twice', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateApiKey().plaintext))
    expect(keys.size).toBe(200)
  })

  it('returns a hash that matches the plaintext, and a prefix taken from it', () => {
    const { plaintext, hash, prefix } = generateApiKey()
    expect(hash).toBe(hashApiKey(plaintext))
    expect(plaintext.startsWith(prefix)).toBe(true)
  })

  it('keeps the stored prefix too short to be usable as a credential', () => {
    const { plaintext, prefix } = generateApiKey()
    expect(prefix.length).toBeLessThan(plaintext.length / 2)
  })
})

describe('hashApiKey', () => {
  it('is stable across calls, so a stored hash keeps matching', () => {
    expect(hashApiKey('ainam_sk_example')).toBe(hashApiKey('ainam_sk_example'))
  })

  it('does not reveal the key it was derived from', () => {
    const { plaintext, hash } = generateApiKey()
    expect(hash).not.toContain(plaintext.slice(9))
  })
})

describe('hashesMatch', () => {
  it('accepts identical hashes and rejects different ones', () => {
    const a = hashApiKey('one')
    expect(hashesMatch(a, hashApiKey('one'))).toBe(true)
    expect(hashesMatch(a, hashApiKey('two'))).toBe(false)
  })

  it('rejects a length mismatch without throwing', () => {
    expect(hashesMatch('short', hashApiKey('one'))).toBe(false)
  })
})
