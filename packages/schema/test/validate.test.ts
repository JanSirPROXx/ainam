import { describe, expect, it } from 'vitest'
import type { Field } from '../src/types'
import { validateContentValue } from '../src/validate'

const text: Field = { type: 'text', label: 'Title', required: true, multiline: false, default: '' }
const number: Field = { type: 'number', label: 'Seats', required: false, default: 3, max: 10 }
const image: Field = { type: 'image', label: 'Hero', required: false, alt: true }

describe('validateContentValue', () => {
  it('accepts a value of the declared kind', () => {
    expect(validateContentValue(text, 'hello')).toBeNull()
    expect(validateContentValue(number, 4)).toBeNull()
    expect(validateContentValue(image, { assetId: 'ast_1', alt: 'A logo' })).toBeNull()
  })

  it('names both sides when a stored value no longer fits its field', () => {
    // The restore path is the only way a value written before a breaking type
    // change can reach a live page, so the message has to say what happened.
    const problem = validateContentValue(text, 42)
    expect(problem).toContain('Expected text')
    expect(problem).toContain('a number')
  })

  it('reports a constraint with the numbers, not a vague complaint', () => {
    expect(validateContentValue({ ...text, maxLength: 5 }, 'far too long')).toBe(
      'Expected at most 5 characters, but this version holds 12.',
    )
    expect(validateContentValue(number, 99)).toBe('Expected at most 10, but this version holds 99.')
  })

  it('treats an absent image as valid, because no file has been uploaded yet', () => {
    expect(validateContentValue(image, null)).toBeNull()
    expect(validateContentValue(text, null)).toContain('Expected text')
  })

  it('checks every field of every list item', () => {
    const list: Field = {
      type: 'list',
      label: 'Plans',
      required: false,
      default: [],
      fields: { name: { type: 'text', label: 'Name', required: true, multiline: false, default: '' } },
    }
    expect(validateContentValue(list, [{ name: 'Pro' }])).toBeNull()
    expect(validateContentValue(list, [{ name: 'Pro' }, { name: 7 }])).toContain('Item 2, "name"')
  })
})
