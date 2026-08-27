import {
  RICH_TEXT_HEADING_LEVELS,
  type RichTextMarkType,
  type RichTextNodeType,
  isSafeLinkHref,
} from '@ainam/schema/rich-text'
import type { RichTextValue } from '@ainam/schema/types'

interface Node {
  type?: string
  content?: unknown
  text?: string
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
  attrs?: Record<string, unknown>
}

/**
 * Escapes text so it cannot become markup.
 *
 * The values here are typed by a site owner and stored verbatim, so this is the
 * boundary between a paragraph and stored XSS on their own domain.
 */
function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * How each node becomes HTML.
 *
 * A table rather than a switch so the set of nodes this renders is a value a
 * test can compare against the allowlist — the editor and the renderer drifting
 * apart shows up as a customer's formatting vanishing on their own site, which
 * nothing else would catch.
 */
const NODE_RENDERERS: Record<string, (node: Node, children: string) => string> = {
  paragraph: (_node, children) => `<p>${children}</p>`,
  heading: (node, children) => {
    const level = headingLevel(node)
    return `<h${level}>${children}</h${level}>`
  },
  bulletList: (_node, children) => `<ul>${children}</ul>`,
  orderedList: (_node, children) => `<ol>${children}</ol>`,
  listItem: (_node, children) => `<li>${children}</li>`,
  blockquote: (_node, children) => `<blockquote>${children}</blockquote>`,
  hardBreak: () => '<br />',
}

/** The mark wrappers, in the order they nest from the inside out. */
const MARK_RENDERERS: Record<string, (content: string, attrs: Record<string, unknown>) => string> = {
  bold: (content) => `<strong>${content}</strong>`,
  italic: (content) => `<em>${content}</em>`,
  code: (content) => `<code>${content}</code>`,
  link: (content, attrs) => {
    // Checked again at render, not only on write: a document can predate the
    // check, and a `javascript:` href here is script on the customer's origin.
    if (!isSafeLinkHref(attrs['href'])) return content
    return `<a href="${escapeAttribute(String(attrs['href']))}" rel="noopener noreferrer">${content}</a>`
  },
}

/** Exposed for the parity test. Not part of the published contract. */
export const RENDERED_NODES: readonly string[] = Object.keys(NODE_RENDERERS)
export const RENDERED_MARKS: readonly string[] = Object.keys(MARK_RENDERERS)

function headingLevel(node: Node): number {
  const level = node.attrs?.['level']
  return (RICH_TEXT_HEADING_LEVELS as readonly number[]).includes(level as number)
    ? (level as number)
    : RICH_TEXT_HEADING_LEVELS[0]
}

function renderNodes(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content.map((node) => renderNode(node as Node)).join('')
}

function renderNode(node: Node): string {
  if (node?.type === 'text') return renderText(node)

  const render = NODE_RENDERERS[node?.type as RichTextNodeType]
  // An unknown node renders its children rather than disappearing with them.
  // Losing a whole section because one wrapper was removed from the allowlist
  // is worse than losing its formatting.
  if (!render) return renderNodes(node?.content)

  return render(node, renderNodes(node.content))
}

function renderText(node: Node): string {
  let rendered = escapeText(node.text ?? '')
  for (const mark of node.marks ?? []) {
    const render = MARK_RENDERERS[mark?.type as RichTextMarkType]
    if (render) rendered = render(rendered, mark.attrs ?? {})
  }
  return rendered
}

/**
 * Renders a rich-text value as an HTML string.
 *
 * For consumers who are not on React, or who want `dangerouslySetInnerHTML`.
 * On React, prefer `AinamRichText` from `@ainam/next`, which builds elements
 * instead and needs no such escape hatch.
 *
 * Every text node is escaped and every link scheme is checked here, so the
 * output is safe to insert even though the input was typed by a person.
 *
 * @example
 * ```ts
 * const body = await ainam.get('home/about/body')
 * const html = renderRichTextToHtml(body)
 * ```
 */
export function renderRichTextToHtml(value: RichTextValue | null | undefined): string {
  if (!value || value.type !== 'doc') return ''
  return renderNodes(value.content)
}
