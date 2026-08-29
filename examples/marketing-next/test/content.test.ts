import { describe, expect, it } from 'vitest'
import type { AinamContent } from '../ainam.gen'
import { createReader } from '@/lib/content'
import { groupFooterLinks } from '@/lib/footer-groups'

describe('createReader', () => {
  it('returns the value for a key that is present', () => {
    const read = createReader({ 'home/hero/title': 'Hello' } as unknown as AinamContent)
    expect(read('home/hero/title')).toBe('Hello')
  })

  it('names the missing key and what to do, rather than failing in a component', () => {
    // The real failure this replaces: `nav/links` came back undefined and the
    // page died on `links.map` inside SiteHeader, three files from the cause.
    const read = createReader({} as unknown as AinamContent)
    expect(() => read('nav/links')).toThrow(/No published content for "nav\/links"/)
    expect(() => read('nav/links')).toThrow(/ainam push/)
  })

  it('does not treat a falsy value as missing', () => {
    // Every section toggle on this page is a boolean that defaults to false.
    const read = createReader({
      'home/logos/visible': false,
      'home/hero/subtitle': '',
    } as unknown as AinamContent)
    expect(read('home/logos/visible')).toBe(false)
    expect(read('home/hero/subtitle')).toBe('')
  })
})

describe('groupFooterLinks', () => {
  const link = (group: string, label: string) => ({ group, label, href: `#${label}` })

  it('keeps the order the columns first appear in', () => {
    const grouped = groupFooterLinks([
      link('Product', 'Overview'),
      link('Legal', 'Licence'),
      link('Product', 'Publishing'),
    ])
    expect(grouped.map(([name]) => name)).toEqual(['Product', 'Legal'])
    expect(grouped[0]?.[1].map((entry) => entry.label)).toEqual(['Overview', 'Publishing'])
  })

  it('returns nothing for an empty list, so the footer collapses to the brand', () => {
    expect(groupFooterLinks([])).toEqual([])
  })
})
