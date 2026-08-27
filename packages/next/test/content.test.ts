import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAinamContent } from '../src/content'

const draft = { enabled: false }

vi.mock('next/headers', () => ({
  draftMode: async () => ({
    get isEnabled() {
      if (draft.enabled === null) throw new Error('draftMode() outside a request')
      return draft.enabled
    },
    enable: () => undefined,
    disable: () => undefined,
  }),
}))

const requested: string[] = []

function respondWith(body: Record<string, unknown>) {
  return vi.fn((input: string | URL | Request) => {
    requested.push(String(input))
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
  })
}

beforeEach(() => {
  draft.enabled = false
  requested.length = 0
})
afterEach(() => vi.unstubAllGlobals())

const config = {
  apiKey: 'ainam_sk_build',
  previewApiKey: 'ainam_sk_preview',
  projectId: 'proj_smoke',
  baseUrl: 'https://cms.example',
  locale: 'en',
}

describe('createAinamContent', () => {
  it('reads published content when draft mode is off', async () => {
    vi.stubGlobal('fetch', respondWith({ 'home/hero/title': 'live' }))
    const ainam = createAinamContent(config)

    await expect(ainam.get('home/hero/title')).resolves.toBe('live')
    expect(requested[0]).toContain('/v1/content/proj_smoke')
  })

  it('reads drafts through the preview endpoint when draft mode is on', async () => {
    draft.enabled = true
    vi.stubGlobal('fetch', respondWith({ 'home/hero/title': 'unpublished' }))
    const ainam = createAinamContent(config)

    await expect(ainam.get('home/hero/title')).resolves.toBe('unpublished')
    // A separate path, so the draft read can be given its own scope.
    expect(requested[0]).toContain('/v1/preview/content/proj_smoke')
  })

  it('stays on published content when no preview key is configured', async () => {
    draft.enabled = true
    vi.stubGlobal('fetch', respondWith({ 'home/hero/title': 'live' }))
    const { previewApiKey: _unused, ...withoutPreviewKey } = config
    const ainam = createAinamContent(withoutPreviewKey)

    await expect(ainam.get('home/hero/title')).resolves.toBe('live')
    expect(requested[0]).toContain('/v1/content/proj_smoke')
  })

  it('falls back to published content outside a request, where draftMode throws', async () => {
    // Static generation and build-time module evaluation both land here, and
    // published content is the right answer in both.
    draft.enabled = null as unknown as boolean
    vi.stubGlobal('fetch', respondWith({ 'home/hero/title': 'live' }))
    const ainam = createAinamContent(config)

    await expect(ainam.get('home/hero/title')).resolves.toBe('live')
    expect(requested[0]).toContain('/v1/content/proj_smoke')
  })

  it('never serves the build-time snapshot as if it were a draft', async () => {
    // Showing published copy to someone who asked for their draft is worse than
    // an error: they would conclude their edit was lost.
    draft.enabled = true
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('CMS unreachable'))),
    )
    const ainam = createAinamContent({
      ...config,
      snapshot: {
        projectId: 'proj_smoke',
        locale: 'en',
        generatedAt: '2026-08-01T00:00:00.000Z',
        entries: { 'home/hero/title': 'stale' },
      },
    })

    await expect(ainam.get('home/hero/title')).rejects.toThrow()
  })
})
