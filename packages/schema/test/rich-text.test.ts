import { describe, expect, it } from 'vitest'
import { isSafeLinkHref, validateRichTextDoc } from '../src/rich-text'

const doc = (...content: unknown[]) => ({ type: 'doc', content })
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })

describe('validateRichTextDoc', () => {
  it('accepts the formatting the editor offers', () => {
    expect(
      validateRichTextDoc(
        doc(
          { type: 'heading', attrs: { level: 2 }, content: [text('A heading')] },
          { type: 'paragraph', content: [text('bold', [{ type: 'bold' }]), { type: 'hardBreak' }] },
          { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('one')] }] }] },
        ),
      ),
    ).toBeNull()
  })

  it('refuses a node no renderer knows', () => {
    // The defect this guards: a node the editor can produce but the site cannot
    // render disappears silently on the customer's own page.
    expect(validateRichTextDoc(doc({ type: 'iframe' }))).toContain('not a formatting')
  })

  it('refuses a heading level the layout does not own', () => {
    // The page's h1 belongs to the site, and two on a page is a real defect an
    // editor cannot see they are creating.
    expect(validateRichTextDoc(doc({ type: 'heading', attrs: { level: 1 }, content: [] }))).toContain('level 1')
  })

  it('refuses an unknown mark', () => {
    expect(validateRichTextDoc(doc({ type: 'paragraph', content: [text('x', [{ type: 'blink' }])] }))).toContain('blink')
  })

  it('rejects anything that is not a document', () => {
    expect(validateRichTextDoc(null)).toContain('Expected a rich-text document')
    expect(validateRichTextDoc({ type: 'paragraph' })).toContain('Expected a rich-text document')
  })
})

describe('isSafeLinkHref', () => {
  it('allows the schemes a link may use, and relative links', () => {
    for (const href of ['https://a.example', 'http://a.example', 'mailto:a@b.example', 'tel:+41000', '/pricing', '#top', 'docs/a:b']) {
      expect(`${href} -> ${isSafeLinkHref(href)}`).toBe(`${href} -> true`)
    }
  })

  it('refuses script URLs, including ones split by characters browsers drop', () => {
    // A browser strips tabs and newlines before parsing, so the scheme has to
    // be checked against the same string the browser will end up with.
    for (const href of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      ' javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ]) {
      expect(`${JSON.stringify(href)} -> ${isSafeLinkHref(href)}`).toBe(`${JSON.stringify(href)} -> false`)
    }
  })

  it('refuses a href that is not a string or is empty', () => {
    expect(isSafeLinkHref(undefined)).toBe(false)
    expect(isSafeLinkHref(42)).toBe(false)
    expect(isSafeLinkHref('   ')).toBe(false)
  })
})
