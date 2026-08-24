import type { ContentValue, Field, RichTextValue } from '@ainam/schema'

/** Wraps a plain default string as the single paragraph the editor expects. */
function paragraph(text: string): RichTextValue {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: text === '' ? [] : [{ type: 'text', text }] }],
  }
}

/**
 * The value a key starts life with.
 *
 * Every kind except `image` declares a mandatory default, which is what stops a
 * fresh integration from rendering a blank page: push seeds this into both the
 * draft and the published row, so the site shows the copy the developer already
 * wrote in their config.
 */
export function seedValueFor(field: Field): ContentValue {
  switch (field.type) {
    case 'text':
      return field.default
    case 'richText':
      return paragraph(field.default)
    case 'boolean':
      return field.default
    case 'number':
      return field.default
    case 'list':
      return field.default as ContentValue
    case 'image':
      // No file has been uploaded yet, and inventing one would be worse than
      // a site that renders no image.
      return null
  }
}
