import { validateRichTextDoc } from './rich-text'
import type { ContentValue, Field, ScalarField, ScalarValue } from './types'

/**
 * Checks a stored value against the field that is supposed to describe it.
 *
 * Needed on the restore path. A version written before a `--allow-breaking`
 * type change holds a value the current field no longer accepts, and putting it
 * back would be the one remaining route by which a mistyped value reaches a live
 * page — every other write path validates at the boundary.
 *
 * Returns `null` when the value fits, or a sentence saying what was expected and
 * what is actually there. The caller adds the key, which it knows and this does
 * not.
 */
export function validateContentValue(field: Field, value: ContentValue): string | null {
  if (field.type === 'list') return validateList(field, value)
  return validateScalar(field, value)
}

function validateList(field: Extract<Field, { type: 'list' }>, value: ContentValue): string | null {
  if (!Array.isArray(value)) return `Expected a list, but this version holds ${describe(value)}.`
  if (field.maxItems !== undefined && value.length > field.maxItems) {
    return `Expected at most ${field.maxItems} items, but this version holds ${value.length}.`
  }

  for (const [index, item] of value.entries()) {
    for (const [name, itemField] of Object.entries(field.fields)) {
      const problem = validateScalar(itemField, item[name] ?? null)
      if (problem) return `Item ${index + 1}, "${name}": ${lowerFirst(problem)}`
    }
  }
  return null
}

function validateScalar(field: ScalarField, value: ScalarValue | ContentValue): string | null {
  switch (field.type) {
    case 'text': {
      if (typeof value !== 'string') return expected('text', value)
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        return `Expected at most ${field.maxLength} characters, but this version holds ${value.length}.`
      }
      return null
    }

    case 'richText':
      // Checked node by node, not just "is it a document": the editor offers a
      // fixed set of formatting, and a node outside it has nothing to render it
      // on the customer's site.
      return isRichText(value) ? validateRichTextDoc(value) : expected('rich text', value)

    case 'image':
      // Null is the legitimate state of an image nobody has uploaded yet, which
      // is why this is the one field kind without a default.
      return value === null || isImage(value) ? null : expected('an image', value)

    case 'boolean':
      return typeof value === 'boolean' ? null : expected('a true/false value', value)

    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return expected('a number', value)
      if (field.min !== undefined && value < field.min) {
        return `Expected at least ${field.min}, but this version holds ${value}.`
      }
      if (field.max !== undefined && value > field.max) {
        return `Expected at most ${field.max}, but this version holds ${value}.`
      }
      return null
    }
  }
}

function isRichText(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'doc' &&
    Array.isArray((value as { content?: unknown }).content)
  )
}

function isImage(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { assetId?: unknown }).assetId === 'string' &&
    typeof (value as { alt?: unknown }).alt === 'string'
  )
}

function expected(kind: string, value: unknown): string {
  return `Expected ${kind}, but this version holds ${describe(value)}.`
}

/** Names what a value actually is, so a message can state both sides. */
function describe(value: unknown): string {
  if (value === null) return 'nothing'
  if (Array.isArray(value)) return 'a list'
  if (isRichText(value)) return 'rich text'
  if (isImage(value)) return 'an image'
  if (typeof value === 'object') return 'a structured value'
  if (typeof value === 'string') return 'text'
  if (typeof value === 'boolean') return 'a true/false value'
  return `a ${typeof value}`
}

function lowerFirst(sentence: string): string {
  return sentence.charAt(0).toLowerCase() + sentence.slice(1)
}
