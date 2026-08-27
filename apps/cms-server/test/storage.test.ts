import { describe, expect, it } from 'vitest'
import { loadEnv } from '../src/env'
import { createStorage, storageKeyFor } from '../src/storage'

const base = {
  DATABASE_URL: 'postgres://ainam:ainam@localhost:5432/ainam',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'https://cms.example',
  STORAGE_BUCKET: 'ainam',
  STORAGE_ACCESS_KEY_ID: 'GK0000000000000000000001',
  STORAGE_SECRET_ACCESS_KEY: '0'.repeat(64),
}

describe('storage keys', () => {
  it("puts a project's objects under one prefix", () => {
    // Which is what makes deleting a project a single deletePrefix rather than
    // a walk over rows that may already have cascaded away.
    expect(storageKeyFor('proj_a', 'ast_b')).toBe('proj_a/ast_b/original.webp')
  })
})

describe('delivery mode', () => {
  it('sends browsers straight to the bucket when a public URL is set', () => {
    const storage = createStorage(loadEnv({ ...base, STORAGE_PUBLIC_URL: 'https://cdn.example/' }))
    expect(storage?.servesBytes).toBe(false)
    expect(storage?.urlFor('proj_a', 'ast_b', 'proj_a/ast_b/original.webp')).toBe(
      'https://cdn.example/proj_a/ast_b/original.webp',
    )
  })

  it('streams through this server when none is set', () => {
    // The fallback exists so a clean checkout works with no bucket policy and
    // no CDN account — at the cost of making us a customer's single point of
    // failure for their images, which .env.example says plainly.
    const storage = createStorage(loadEnv(base))
    expect(storage?.servesBytes).toBe(true)
    expect(storage?.urlFor('proj_a', 'ast_b', 'proj_a/ast_b/original.webp')).toBe(
      'https://cms.example/v1/assets/proj_a/ast_b',
    )
  })

  it('runs without storage rather than refusing to start', () => {
    expect(createStorage(loadEnv({ DATABASE_URL: base.DATABASE_URL, BETTER_AUTH_SECRET: base.BETTER_AUTH_SECRET }))).toBeUndefined()
  })

  it('refuses a half-configured bucket instead of failing at first upload', () => {
    expect(() => loadEnv({ ...base, STORAGE_SECRET_ACCESS_KEY: '' })).toThrow(/half-configured/)
  })
})
