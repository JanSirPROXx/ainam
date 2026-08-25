import { describe, expect, it, vi } from 'vitest'
import { AinamError, createAinamClient } from '../src/index'
import type { ContentSnapshot } from '../src/index'

const BASE = {
  apiKey: 'test-key',
  projectId: 'proj_test',
  baseUrl: 'https://cms.example.test',
}

const snapshot: ContentSnapshot = {
  projectId: 'proj_test',
  locale: 'en',
  generatedAt: '2026-08-24T00:00:00.000Z',
  entries: { 'home/hero/title': 'From the snapshot' },
}

function respondWith(body: unknown, status = 200): typeof globalThis.fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  ) as unknown as typeof globalThis.fetch
}

describe('configuration', () => {
  it('names the missing option rather than failing generically', () => {
    expect(() => createAinamClient({ ...BASE, apiKey: '' })).toThrowError(
      /Missing "apiKey"/,
    )
  })
})

describe('reading content', () => {
  it('returns a single entry by key', async () => {
    const client = createAinamClient({
      ...BASE,
      fetch: respondWith({ 'home/hero/title': 'Content, decoupled' }),
    })
    await expect(client.get('home/hero/title')).resolves.toBe('Content, decoupled')
  })

  it('throws on a missing key, naming what to do about it', async () => {
    // Safe to throw only because push seeds a value for every key in the
    // schema, which is what lets the generated accessors be non-nullable.
    const client = createAinamClient({ ...BASE, fetch: respondWith({}) })
    await expect(client.get('home/hero/title')).rejects.toMatchObject({ code: 'not_found' })
    await expect(client.get('home/hero/title')).rejects.toThrowError(/ainam push/)
  })

  it('returns undefined from getOptional for a key that may be absent', async () => {
    const client = createAinamClient({ ...BASE, fetch: respondWith({}) })
    await expect(client.getOptional('maybe/here')).resolves.toBeUndefined()
  })

  it('types each key from the generated map', async () => {
    type Site = { 'home/hero/title': string; 'home/pricing/visible': boolean }

    const client = createAinamClient<Site>({
      ...BASE,
      fetch: respondWith({ 'home/hero/title': 'typed', 'home/pricing/visible': true }),
    })

    const title: string = await client.get('home/hero/title')
    const visible: boolean = await client.get('home/pricing/visible')
    expect([title, visible]).toEqual(['typed', true])
  })

  it('deduplicates concurrent reads into one request', async () => {
    const fetchImpl = respondWith({ 'a/b/c': 'once' })
    const client = createAinamClient({ ...BASE, fetch: fetchImpl })

    await Promise.all([client.getAll(), client.getAll(), client.getAll()])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('maps an authentication failure to a code the caller can branch on', async () => {
    const client = createAinamClient({ ...BASE, fetch: respondWith({}, 401) })
    await expect(client.getAll()).rejects.toMatchObject({ code: 'unauthorized' })
  })
})

describe('surviving CMS downtime', () => {
  it('serves the build-time snapshot when the request fails', async () => {
    const failing = vi.fn(async () => {
      throw new Error('connection refused')
    }) as unknown as typeof globalThis.fetch
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const client = createAinamClient({ ...BASE, snapshot, fetch: failing })

    await expect(client.get('home/hero/title')).resolves.toBe('From the snapshot')
    // A silent fallback would hide an outage until the content went stale.
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('propagates the error when no snapshot was supplied', async () => {
    const failing = vi.fn(async () => {
      throw new Error('connection refused')
    }) as unknown as typeof globalThis.fetch

    const client = createAinamClient({ ...BASE, fetch: failing })

    await expect(client.getAll()).rejects.toBeInstanceOf(AinamError)
  })
})
