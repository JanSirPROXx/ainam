import { afterEach, describe, expect, it } from 'vitest'
import { CMS_URL_META_NAME, cmsUrl, normaliseCmsUrl } from '@/lib/runtime-config'

describe('normaliseCmsUrl', () => {
  it('falls back to the local address when nothing is configured', () => {
    expect(normaliseCmsUrl(undefined)).toBe('http://localhost:8787')
    // Compose renders an unset variable as an empty string, not as absent.
    expect(normaliseCmsUrl('')).toBe('http://localhost:8787')
    expect(normaliseCmsUrl('   ')).toBe('http://localhost:8787')
  })

  it('drops trailing slashes, so a path is never joined with a double slash', () => {
    expect(normaliseCmsUrl('https://cms.example.com/')).toBe('https://cms.example.com')
    expect(normaliseCmsUrl('https://cms.example.com///')).toBe('https://cms.example.com')
  })

  it('keeps a port and a path prefix', () => {
    expect(normaliseCmsUrl('http://10.0.0.5:9000')).toBe('http://10.0.0.5:9000')
    expect(normaliseCmsUrl('https://example.com/cms')).toBe('https://example.com/cms')
  })
})

describe('cmsUrl in a browser', () => {
  afterEach(() => {
    document.head.querySelector(`meta[name="${CMS_URL_META_NAME}"]`)?.remove()
  })

  function renderMeta(content: string): void {
    const meta = document.createElement('meta')
    meta.name = CMS_URL_META_NAME
    meta.content = content
    document.head.append(meta)
  }

  it('reads the address the server rendered, not a value baked into the script', () => {
    renderMeta('https://cms.example.com/')
    expect(cmsUrl()).toBe('https://cms.example.com')
  })

  it('follows the tag, so one build serves whichever server it was started for', () => {
    renderMeta('https://first.example.com')
    expect(cmsUrl()).toBe('https://first.example.com')

    document.head.querySelector(`meta[name="${CMS_URL_META_NAME}"]`)?.remove()
    renderMeta('https://second.example.com')
    expect(cmsUrl()).toBe('https://second.example.com')
  })

  it('falls back to the local address when the tag is missing', () => {
    expect(cmsUrl()).toBe('http://localhost:8787')
  })
})
