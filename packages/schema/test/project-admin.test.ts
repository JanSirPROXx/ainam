import { describe, expect, it } from 'vitest'
import { createProjectRequestSchema } from '../src/project-admin'

describe('createProjectRequestSchema', () => {
  it('trims the name, so the slug and the organisation are not named after whitespace', () => {
    expect(createProjectRequestSchema.parse({ name: '  Acme web  ' })).toEqual({ name: 'Acme web' })
  })

  it('refuses a name with nothing in it, and says what to do', () => {
    const result = createProjectRequestSchema.safeParse({ name: '   ' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Give the project a name.')
  })

  it('does not accept a locale, which belongs to the website’s code', () => {
    // Unknown keys are stripped rather than honoured: `ainam push` is what sets
    // the locales, and a second way to set them would let the two disagree.
    expect(createProjectRequestSchema.parse({ name: 'Acme', defaultLocale: 'de' })).toEqual({
      name: 'Acme',
    })
  })
})
