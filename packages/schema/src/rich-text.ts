/**
 * What a rich-text value may contain.
 *
 * One list, four consumers: the TipTap editor is configured from it, the server
 * validates writes against it, and both renderers map over it. A hand-picked
 * extension list in the editor would drift from the renderers, and the drift
 * surfaces as a customer's formatting silently vanishing on their own site.
 *
 * The set is deliberately small. Every node added here has to be offered in the
 * editor, serialised to HTML, and mapped to a React element — so a node that
 * cannot be rendered everywhere must not exist.
 */
export const RICH_TEXT_NODES = [
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'hardBreak',
] as const

export type RichTextNodeType = (typeof RICH_TEXT_NODES)[number]

export const RICH_TEXT_MARKS = ['bold', 'italic', 'code', 'link'] as const

export type RichTextMarkType = (typeof RICH_TEXT_MARKS)[number]

/**
 * Only h2 and h3.
 *
 * The page's h1 belongs to the site's layout, not to a content field: two of
 * them on one page is a real accessibility and SEO defect, and an editor cannot
 * see the surrounding markup to know they are making one.
 */
export const RICH_TEXT_HEADING_LEVELS = [2, 3] as const

/**
 * Schemes a link mark may use.
 *
 * `javascript:` in an href is stored XSS on whatever origin serves the
 * customer's site, and the value arrives through an admin API that an invited
 * editor can reach. Checked on write and again at render.
 */
const SAFE_LINK_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Strips the characters a browser drops before it parses a URL.
 *
 * Without this `java&#9;script:alert(1)` reads as having no scheme, passes as a
 * relative link, and then executes once the browser has removed the tab. Tabs,
 * newlines and other control characters are the classic bypass, so they come
 * out before anything is compared.
 */
function stripIgnoredCharacters(href: string): string {
  // eslint-disable-next-line no-control-regex -- removing them is the point
  return href.replace(/[\u0000-\u0020\u007f]/g, '')
}

export function isSafeLinkHref(href: unknown): href is string {
  if (typeof href !== 'string') return false

  const cleaned = stripIgnoredCharacters(href)
  if (cleaned === '') return false
  // Relative links stay on the customer's own site, so they need no scheme.
  if (cleaned.startsWith('/') || cleaned.startsWith('#')) return true

  const colon = cleaned.indexOf(':')
  const separator = cleaned.search(/[/?#]/)
  // A colon that comes after the first path separator is part of the path, not
  // a scheme — "docs/a:b" is a relative link.
  if (colon === -1 || (separator !== -1 && separator < colon)) return true

  return SAFE_LINK_SCHEMES.includes(cleaned.slice(0, colon + 1).toLowerCase())
}

interface UnknownNode {
  type?: unknown
  content?: unknown
  text?: unknown
  marks?: unknown
  attrs?: unknown
}

/**
 * Checks a stored document against the allowlist.
 *
 * Returns null when every node and mark is one all four consumers understand,
 * or a sentence naming the first one that is not. The renderers ignore unknown
 * nodes rather than trusting this, so a document that predates a removal still
 * renders — this is what stops one being written in the first place.
 */
export function validateRichTextDoc(value: unknown): string | null {
  const doc = value as UnknownNode
  if (doc?.type !== 'doc') return 'Expected a rich-text document.'
  return validateContent(doc.content, 'the document')
}

function validateContent(content: unknown, where: string): string | null {
  if (content === undefined) return null
  if (!Array.isArray(content)) return `Expected a list of nodes in ${where}.`

  for (const child of content) {
    const problem = validateNode(child as UnknownNode)
    if (problem) return problem
  }
  return null
}

function validateNode(node: UnknownNode): string | null {
  const type = node?.type
  if (typeof type !== 'string' || !(RICH_TEXT_NODES as readonly string[]).includes(type)) {
    return `"${String(type)}" is not a formatting this editor offers.`
  }

  if (type === 'text') {
    if (typeof node.text !== 'string') return 'A text node carries no text.'
    return validateMarks(node.marks)
  }

  if (type === 'heading') {
    const level = (node.attrs as { level?: unknown } | undefined)?.level
    if (!(RICH_TEXT_HEADING_LEVELS as readonly number[]).includes(level as number)) {
      return `Heading level ${String(level)} is not offered — use ${RICH_TEXT_HEADING_LEVELS.join(' or ')}.`
    }
  }

  return validateContent(node.content, `a ${type}`)
}

function validateMarks(marks: unknown): string | null {
  if (marks === undefined) return null
  if (!Array.isArray(marks)) return 'Expected a list of marks on a text node.'

  for (const mark of marks as UnknownNode[]) {
    const type = mark?.type
    if (typeof type !== 'string' || !(RICH_TEXT_MARKS as readonly string[]).includes(type)) {
      return `"${String(type)}" is not a formatting this editor offers.`
    }
    if (type === 'link' && !isSafeLinkHref((mark.attrs as { href?: unknown } | undefined)?.href)) {
      return 'A link must point at http, https, mailto, tel, or a path on this site.'
    }
  }
  return null
}
