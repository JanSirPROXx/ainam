import type { ContentValue, ResolvedImage } from '@ainam/schema'
import { describe, expect, it } from 'vitest'
import type { Database } from '../src/db/client'
import { resolveImages } from '../src/services/assets/resolve-images'
import type { Storage } from '../src/storage'

const records = [
  { id: 'ast_hero', storageKey: 'proj/ast_hero/original.webp', width: 1200, height: 630 },
  { id: 'ast_logo', storageKey: 'proj/ast_logo/original.webp', width: 64, height: 64 },
]

/** Stands in for the one `where id = any($1)` the resolver makes. */
const db = {
  select: () => ({
    from: () => ({
      where: () => Promise.resolve(records),
    }),
  }),
} as unknown as Database

const storage = {
  servesBytes: false,
  store: {} as Storage['store'],
  urlFor: (_projectId: string, _assetId: string, key: string) => `https://cdn.example/${key}`,
} satisfies Storage

const image = (assetId: string, alt: string) => ({ assetId, alt }) as ContentValue

describe('resolveImages', () => {
  it('splices in the url and the intrinsic dimensions', async () => {
    const resolved = await resolveImages(db, storage, 'proj', {
      'home/hero/image': image('ast_hero', 'A hero'),
    })

    expect(resolved['home/hero/image']).toEqual({
      assetId: 'ast_hero',
      alt: 'A hero',
      url: 'https://cdn.example/proj/ast_hero/original.webp',
      width: 1200,
      height: 630,
    } satisfies ResolvedImage)
  })

  it('reaches images inside list items', async () => {
    // The case a map-level pass would miss, and it would surface as one broken
    // image in a repeating section rather than as an error anyone notices.
    const resolved = await resolveImages(db, storage, 'proj', {
      'home/logos': [
        { name: 'One', logo: image('ast_logo', 'One') },
        { name: 'Two', logo: image('ast_hero', 'Two') },
      ] as ContentValue,
    })

    const list = resolved['home/logos'] as Array<Record<string, ResolvedImage | string>>
    const [first, second] = list
    expect((first?.['logo'] as ResolvedImage | undefined)?.width).toBe(64)
    expect((second?.['logo'] as ResolvedImage | undefined)?.url).toContain('ast_hero')
    expect(first?.['name']).toBe('One')
  })

  it('leaves an asset id it cannot find, so the page still renders', async () => {
    // Happens when a bucket is restored from an older backup. The SDK's
    // ainamImageProps returns null for a value with no url, so the page renders
    // without the image instead of failing.
    const resolved = await resolveImages(db, storage, 'proj', {
      'home/hero/image': image('ast_gone', 'Missing'),
    })
    expect(resolved['home/hero/image']).toEqual({ assetId: 'ast_gone', alt: 'Missing' })
  })

  it('touches nothing when there is no storage or no image', async () => {
    const content = { 'home/hero/title': 'A title' }
    expect(await resolveImages(db, storage, 'proj', content)).toEqual(content)
    expect(await resolveImages(db, undefined, 'proj', { a: image('ast_hero', '') })).toEqual({
      a: { assetId: 'ast_hero', alt: '' },
    })
  })
})
