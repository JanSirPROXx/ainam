import { previewSignaturePayload, signWebhookBody } from '@ainam/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPreviewHandler } from '../src/preview'

const draft = { enabled: false }

// `next/headers` only exists inside a request; the handler's contract with it is
// two calls, so a stub is enough and keeps the test free of a running server.
vi.mock('next/headers', () => ({
  draftMode: async () => ({
    get isEnabled() {
      return draft.enabled
    },
    enable: () => {
      draft.enabled = true
    },
    disable: () => {
      draft.enabled = false
    },
  }),
}))

const SECRET = 'ainam_whsec_test'
const PROJECT = 'proj_smoke'
const handler = createPreviewHandler({ secret: SECRET, projectId: PROJECT })

async function link(overrides: { locale?: string; expiresAt?: number; signature?: string } = {}) {
  const locale = overrides.locale ?? 'en'
  const expiresAt = overrides.expiresAt ?? Date.now() + 60_000
  const signature =
    overrides.signature ??
    (await signWebhookBody(SECRET, previewSignaturePayload(PROJECT, locale, expiresAt)))
  return new Request(
    `https://site.example/api/ainam/preview?locale=${locale}&expires=${expiresAt}&signature=${signature}`,
  )
}

beforeEach(() => {
  draft.enabled = false
})

describe('createPreviewHandler', () => {
  it('turns draft mode on for a link the CMS signed', async () => {
    const response = await handler(await link())
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://site.example/')
    expect(draft.enabled).toBe(true)
  })

  it('refuses a tampered signature', async () => {
    const response = await handler(await link({ signature: '0'.repeat(64) }))
    expect(response.status).toBe(401)
    expect(draft.enabled).toBe(false)
  })

  it('refuses a signature made for a different locale', async () => {
    // The locale is inside the signed payload, so it cannot be swapped for one
    // whose drafts the link was never meant to expose.
    const expiresAt = Date.now() + 60_000
    const signature = await signWebhookBody(
      SECRET,
      previewSignaturePayload(PROJECT, 'de', expiresAt),
    )
    const response = await handler(await link({ locale: 'en', expiresAt, signature }))
    expect(response.status).toBe(401)
    expect(draft.enabled).toBe(false)
  })

  it('refuses an expired link', async () => {
    const response = await handler(await link({ expiresAt: Date.now() - 1 }))
    expect(response.status).toBe(401)
    expect(draft.enabled).toBe(false)
  })

  it('says what is missing rather than failing blankly', async () => {
    const response = await handler(new Request('https://site.example/api/ainam/preview'))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('signature'),
    })
  })

  it('lets a visitor leave draft mode without a signature', async () => {
    // Removing access is not a privilege. Someone stuck in preview with no way
    // out is a worse outcome than an unauthenticated way to leave it.
    draft.enabled = true
    const response = await handler(new Request('https://site.example/api/ainam/preview?exit=1'))
    expect(response.status).toBe(307)
    expect(draft.enabled).toBe(false)
  })

  it('redirects only within the site it is installed on', async () => {
    const handlerWithPath = createPreviewHandler({
      secret: SECRET,
      projectId: PROJECT,
      redirectTo: '/pricing',
    })
    const response = await handlerWithPath(await link())
    expect(response.headers.get('location')).toBe('https://site.example/pricing')
  })
})

describe('an unconfigured site', () => {
  const unconfigured = createPreviewHandler({ secret: '', projectId: PROJECT })

  it('says which variable is missing instead of failing opaquely', async () => {
    // Web Crypto rejects an empty HMAC key, so without a guard this is a 500
    // with no clue what to fix — on a self-hosted deployment nobody can ask us.
    const response = await unconfigured(await link())
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('AINAM_WEBHOOK_SECRET'),
    })
  })

  it('still lets a visitor leave draft mode', async () => {
    draft.enabled = true
    const response = await unconfigured(new Request('https://site.example/api/ainam/preview?exit=1'))
    expect(response.status).toBe(307)
    expect(draft.enabled).toBe(false)
  })
})
