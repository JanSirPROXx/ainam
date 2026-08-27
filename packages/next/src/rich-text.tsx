import { RICH_TEXT_HEADING_LEVELS, isSafeLinkHref, type RichTextValue } from '@ainam/core'
import { Fragment, type ReactNode, createElement } from 'react'

interface Node {
  type?: string
  content?: unknown
  text?: string
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
  attrs?: Record<string, unknown>
}

/**
 * The element each node becomes.
 *
 * A table rather than a switch, so the set of nodes this renders is a value the
 * parity test can compare against the allowlist. A node the editor can produce
 * and this cannot render is formatting that vanishes on the customer's site.
 */
const NODE_ELEMENTS: Record<string, string> = {
  paragraph: 'p',
  bulletList: 'ul',
  orderedList: 'ol',
  listItem: 'li',
  blockquote: 'blockquote',
  hardBreak: 'br',
}

const MARK_ELEMENTS: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  code: 'code',
}

/** Exposed for the parity test. Not part of the published contract. */
export const RENDERED_NODES: readonly string[] = [...Object.keys(NODE_ELEMENTS), 'heading']
export const RENDERED_MARKS: readonly string[] = [...Object.keys(MARK_ELEMENTS), 'link']

function headingTag(node: Node): string {
  const level = node.attrs?.['level']
  const allowed = (RICH_TEXT_HEADING_LEVELS as readonly number[]).includes(level as number)
  return `h${allowed ? (level as number) : RICH_TEXT_HEADING_LEVELS[0]}`
}

function renderNodes(content: unknown): ReactNode {
  if (!Array.isArray(content)) return null
  // Keyed by position, which is the only identity these nodes have: the tree is
  // rendered whole from an immutable document and never reordered in place, so
  // there is nothing for React to reuse incorrectly.
  return content.map((node, index) => (
    // oxlint-disable-next-line react/no-array-index-key
    <Fragment key={index}>{renderNode(node as Node)}</Fragment>
  ))
}

function renderNode(node: Node): ReactNode {
  if (node?.type === 'text') return renderText(node)
  if (node?.type === 'heading') {
    return createElement(headingTag(node), null, renderNodes(node.content))
  }

  const tag = NODE_ELEMENTS[node?.type ?? '']
  // An unknown node renders its children rather than taking them with it.
  if (!tag) return renderNodes(node?.content)
  if (tag === 'br') return <br />

  return createElement(tag, null, renderNodes(node.content))
}

function renderText(node: Node): ReactNode {
  // React escapes text on its own, so nothing here has to — which is the reason
  // to prefer this over the HTML string renderer and dangerouslySetInnerHTML.
  let rendered: ReactNode = node.text ?? ''

  for (const mark of node.marks ?? []) {
    if (mark?.type === 'link') {
      const href = mark.attrs?.['href']
      // A `javascript:` href is script on the customer's own origin. Checked
      // again here because a stored document can predate the check on write.
      if (!isSafeLinkHref(href)) continue
      rendered = (
        <a href={href} rel="noopener noreferrer">
          {rendered}
        </a>
      )
      continue
    }

    const tag = MARK_ELEMENTS[mark?.type ?? '']
    if (tag) rendered = createElement(tag, null, rendered)
  }

  return rendered
}

export interface AinamRichTextProps {
  value: RichTextValue | null | undefined
  /** Wrapper element. Defaults to a `div`; pass null to render without one. */
  as?: string | null
  className?: string
}

/**
 * Renders a rich-text value as React elements.
 *
 * Elements rather than an HTML string, so there is no `dangerouslySetInnerHTML`
 * anywhere in a consumer's page and React does the escaping. Only the nodes the
 * editor offers are rendered; anything else contributes its children.
 *
 * @example
 * ```tsx
 * const body = await ainam.get('home/about/body')
 * return <AinamRichText value={body} className="prose" />
 * ```
 */
export function AinamRichText({ value, as = 'div', className }: AinamRichTextProps) {
  if (!value || value.type !== 'doc') return null

  const children = renderNodes(value.content)
  if (as === null) return <>{children}</>

  return createElement(as, className === undefined ? null : { className }, children)
}
