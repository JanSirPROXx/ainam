import { describe, expect, it } from 'vitest'
import { slugify } from '../src/lib/slug'

describe('slugify', () => {
  it('lowercases and hyphenates a plain name', () => {
    expect(slugify('Acme web')).toBe('acme-web')
  })

  it('folds accents instead of dropping the letter', () => {
    // Dropping would turn "Café Zürich" into "caf-z-rich", which reads as a bug.
    expect(slugify('Café Zürich')).toBe('cafe-zurich')
  })

  it('collapses runs of punctuation and trims the ends', () => {
    expect(slugify('  --Acme & Sons!!  ')).toBe('acme-sons')
  })

  it('still produces a slug when nothing in the name is usable', () => {
    // The column is not nullable, and a name in a script this does not
    // transliterate is a legitimate project name.
    expect(slugify('日本語')).toBe('project')
    expect(slugify('!!!')).toBe('project')
  })

  it('caps the length without leaving a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(47)} bbbb`)
    expect(slug.length).toBeLessThanOrEqual(48)
    expect(slug.endsWith('-')).toBe(false)
  })
})
