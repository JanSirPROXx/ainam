import { useEffect, useRef, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { cx } from '../lib/cx'

/** How long the copy button reports success before reverting to its resting label. */
const COPY_FEEDBACK_MS = 1200

export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  code?: string | undefined
  /** Shown in the bar when `filename` is absent, uppercased. @default 'tsx' */
  language?: string | undefined
  /** Overrides `language` in the bar, shown as written. */
  filename?: string | undefined
  /** @default true */
  showLineNumbers?: boolean | undefined
  /** @default true */
  copyable?: boolean | undefined
}

/**
 * Code sample with a mono chrome bar — AINAM's signature hero content, carrying
 * marketing pages as well as docs.
 *
 * Deliberately not syntax-highlighted: a single `--text-body` colour keeps the
 * near-monochrome palette intact. Line numbers drop to `--text-faint`.
 *
 * @example
 * ```tsx
 * <CodeBlock
 *   filename="app/page.tsx"
 *   code={"import { content } from '@ainam/next'\n\nconst hero = await content('hero')"}
 * />
 * ```
 */
export function CodeBlock({
  code = '',
  language = 'tsx',
  filename,
  showLineNumbers = true,
  copyable = true,
  className,
  ...rest
}: CodeBlockProps) {
  const lines = code.replace(/\n$/, '').split('\n')

  return (
    <div {...rest} className={cx('ainam-code', className)}>
      <div className="ainam-code__bar">
        <span className={cx('ainam-code__label', !filename && 'ainam-code__label--language')}>
          {filename ?? language}
        </span>
        {copyable && <CopyButton code={code} />}
      </div>
      <pre className="ainam-code__pre">
        <code className="ainam-code__code">
          {lines.map((line, index) => (
            // Lines are positional and never reordered, so the index IS the identity
            // here — the usual objection to index keys does not apply.
            // oxlint-disable-next-line no-array-index-key
            <span key={index} className="ainam-code__line">
              {showLineNumbers && <span className="ainam-code__gutter">{index + 1}</span>}
              <span className="ainam-code__text">{line}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const revert = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(revert.current), [])

  async function copy() {
    // Outside a secure context there is no clipboard API. Say nothing rather
    // than reporting a copy that did not happen.
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      return
    }
    setCopied(true)
    clearTimeout(revert.current)
    revert.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
  }

  return (
    <button
      type="button"
      className={cx('ainam-code__copy', copied && 'ainam-code__copy--copied')}
      onClick={() => void copy()}
      aria-live="polite"
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}
