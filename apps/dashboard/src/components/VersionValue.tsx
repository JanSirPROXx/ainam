import type { ContentValue } from '@ainam/schema'

const MAX_CHARACTERS = 160

/**
 * A past value, shown compactly enough to scan a list of them.
 *
 * Truncated rather than scrolled: this is here to answer "which version do I
 * want", not to be read in full. Structured values are rendered as JSON, which
 * is honest about what is stored — a half-rendered image or rich-text preview
 * would suggest the history holds something it does not.
 */
export function VersionValue({ value }: { value: ContentValue }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const shown = text === '' ? '(empty)' : text.slice(0, MAX_CHARACTERS)

  return (
    <span style={{ font: 'var(--type-code)', color: 'var(--text-muted)' }}>
      {shown}
      {text.length > MAX_CHARACTERS ? '…' : ''}
    </span>
  )
}
