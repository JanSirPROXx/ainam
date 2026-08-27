import { RICH_TEXT_MARKS, RICH_TEXT_NODES } from '@ainam/schema/rich-text'
import { describe, expect, it } from 'vitest'
import { RENDERED_MARKS, RENDERED_NODES, renderRichTextToHtml } from '../src/rich-text'

const doc = (...content: unknown[]) => ({ type: 'doc' as const, content })
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })

describe('renderRichTextToHtml', () => {
  it('renders every node the editor offers', () => {
    expect(
      renderRichTextToHtml(
        doc(
          { type: 'heading', attrs: { level: 3 }, content: [text('Title')] },
          { type: 'paragraph', content: [text('plain '), text('bold', [{ type: 'bold' }])] },
          { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('one')] }] }] },
        ),
      ),
    ).toBe('<h3>Title</h3><p>plain <strong>bold</strong></p><ul><li><p>one</p></li></ul>')
  })

  it('escapes text, because a site owner types it and a page renders it', () => {
    expect(renderRichTextToHtml(doc({ type: 'paragraph', content: [text('<script>alert(1)</script>')] }))).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
  })

  it('drops a link whose scheme could run script, keeping its text', () => {
    // Checked again at render, not only on write: the document may predate the
    // check, and losing the words would be worse than losing the link.
    expect(
      renderRichTextToHtml(
        doc({ type: 'paragraph', content: [text('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])] }),
      ),
    ).toBe('<p>click</p>')
  })

  it('escapes a link href it does allow', () => {
    expect(
      renderRichTextToHtml(
        doc({ type: 'paragraph', content: [text('go', [{ type: 'link', attrs: { href: 'https://a.example/?a=1"&b=2' } }])] }),
      ),
    ).toBe('<p><a href="https://a.example/?a=1&quot;&amp;b=2" rel="noopener noreferrer">go</a></p>')
  })

  it('keeps the children of a node it does not know', () => {
    // Losing a whole section because one wrapper was removed from the allowlist
    // is worse than losing its formatting.
    expect(renderRichTextToHtml(doc({ type: 'callout', content: [{ type: 'paragraph', content: [text('kept')] }] }))).toBe(
      '<p>kept</p>',
    )
  })

  it('renders nothing for an absent or malformed value', () => {
    expect(renderRichTextToHtml(null)).toBe('')
    expect(renderRichTextToHtml(undefined)).toBe('')
    expect(renderRichTextToHtml({ type: 'doc', content: [] })).toBe('')
  })

  it('falls back to an offered heading level rather than emitting an h1', () => {
    expect(renderRichTextToHtml(doc({ type: 'heading', attrs: { level: 1 }, content: [text('x')] }))).toBe('<h2>x</h2>')
  })
})

describe('renderer parity with the allowlist', () => {
  // The whole reason the allowlist exists: an editor that can produce a node
  // the renderer has no case for makes that formatting vanish on the customer's
  // own site, and nothing else in the pipeline would notice.
  it('renders every node in the allowlist', () => {
    const structural = ['doc', 'text']
    const expected = RICH_TEXT_NODES.filter((node) => !structural.includes(node))
    expect([...RENDERED_NODES].sort()).toEqual([...expected].sort())
  })

  it('renders every mark in the allowlist', () => {
    expect([...RENDERED_MARKS].sort()).toEqual([...RICH_TEXT_MARKS].sort())
  })
})
