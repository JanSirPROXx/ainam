import { describe, expect, it } from 'vitest'
import { dictionaryFor } from '@/lib/dictionary'
import { DEFAULT_LOCALE, hasLocale, LOCALES, pickLocale } from '@/lib/i18n'

describe('pickLocale', () => {
  it('takes the language the browser prefers most', () => {
    expect(pickLocale('de,en;q=0.5')).toBe('de')
    expect(pickLocale('en;q=0.4,de;q=0.9')).toBe('de')
  })

  it('reads a regional variant as its language, so a Swiss visitor gets German', () => {
    expect(pickLocale('de-CH,de;q=0.9,en;q=0.8')).toBe('de')
    expect(pickLocale('en-GB')).toBe('en')
  })

  it('skips languages it does not have and takes the next one it does', () => {
    expect(pickLocale('fr-CH,fr;q=0.9,de;q=0.8')).toBe('de')
  })

  it('lands on English when nothing matches, or nothing was sent', () => {
    expect(pickLocale('fr,es;q=0.5')).toBe(DEFAULT_LOCALE)
    expect(pickLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(pickLocale('')).toBe(DEFAULT_LOCALE)
    expect(pickLocale('*')).toBe(DEFAULT_LOCALE)
  })

  it('ignores a language the browser rules out with q=0', () => {
    expect(pickLocale('de;q=0,en')).toBe('en')
  })

  it('survives a header that is not a header', () => {
    expect(pickLocale(';;;,q=,de;q=abc')).toBe(DEFAULT_LOCALE)
  })
})

describe('hasLocale', () => {
  it('accepts exactly the languages the site is built in', () => {
    for (const locale of LOCALES) expect(hasLocale(locale)).toBe(true)
    expect(hasLocale('fr')).toBe(false)
    expect(hasLocale('')).toBe(false)
    expect(hasLocale('EN')).toBe(false)
  })
})

describe('dictionaryFor', () => {
  it('has no empty word in any language', () => {
    for (const locale of LOCALES) {
      const { publish, ...rest } = dictionaryFor(locale)
      for (const value of [...Object.values(rest), ...Object.values(publish)]) {
        expect(typeof value === 'string' && value.trim() !== '').toBe(true)
      }
      // The count has to land somewhere in the sentence.
      expect(publish.cards).toContain('{count}')
    }
  })

  it('differs between the languages, so nothing was left untranslated', () => {
    expect(dictionaryFor('de').signIn).not.toBe(dictionaryFor('en').signIn)
    expect(dictionaryFor('de').publish.showDrafts).not.toBe(dictionaryFor('en').publish.showDrafts)
  })
})
