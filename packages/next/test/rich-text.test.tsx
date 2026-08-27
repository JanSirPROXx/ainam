import { RICH_TEXT_MARKS, RICH_TEXT_NODES } from '@ainam/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AinamRichText, RENDERED_MARKS, RENDERED_NODES } from '../src/rich-text'

const doc = (...content: unknown[]) => ({ type: 'doc' as const, content })
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })
const html = (value: unknown) => renderToStaticMarkup(<AinamRichText value={value as never} as={null} />)

describe('AinamRichText', () => {
  it('renders every node the editor offers', () => {
    expect(
      html(
        doc(
          { type: 'heading', attrs: { level: 3 }, content: [text('Title')] },
          { type: 'paragraph', content: [text('plain '), text('bold', [{ type: 'bold' }])] },
          { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [text('one')] }] }] },
        ),
      ),
    ).toBe('<h3>Title</h3><p>plain <strong>bold</strong></p><ul><li><p>one</p></li></ul>')
  })

  it('escapes text through React, with no dangerouslySetInnerHTML anywhere', () => {
    expect(html(doc({ type: 'paragraph', content: [text('<script>alert(1)</script>')] }))).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
  })

  it('drops a link whose scheme could run script, keeping its text', () => {
    expect(
      html(doc({ type: 'paragraph', content: [text('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])] })),
    ).toBe('<p>click</p>')
  })

  it('keeps the children of a node it does not know', () => {
    expect(html(doc({ type: 'callout', content: [{ type: 'paragraph', content: [text('kept')] }] }))).toBe('<p>kept</p>')
  })

  it('wraps in the requested element, or in none', () => {
    const value = doc({ type: 'paragraph', content: [text('x')] })
    expect(renderToStaticMarkup(<AinamRichText value={value as never} className="prose" />)).toBe(
      '<div class="prose"><p>x</p></div>',
    )
    expect(renderToStaticMarkup(<AinamRichText value={null} />)).toBe('')
  })

  it('never emits an h1, which belongs to the site layout', () => {
    expect(html(doc({ type: 'heading', attrs: { level: 1 }, content: [text('x')] }))).toBe('<h2>x</h2>')
  })
})

describe('renderer parity with the allowlist', () => {
  it('renders every node in the allowlist', () => {
    const structural = ['doc', 'text']
    expect([...RENDERED_NODES].sort()).toEqual(RICH_TEXT_NODES.filter((n) => !structural.includes(n)).sort())
  })

  it('renders every mark in the allowlist', () => {
    expect([...RENDERED_MARKS].sort()).toEqual([...RICH_TEXT_MARKS].sort())
  })
})
