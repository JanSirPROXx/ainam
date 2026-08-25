import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode | undefined
  /** Prepends a 24px hairline rule. */
  rule?: boolean | undefined
}

/**
 * The section kicker that opens every marketing and docs heading.
 *
 * Always mono, uppercase, 11px, 0.08em tracking, `--text-faint`. Never
 * coloured — status hue belongs to `Badge`, not here.
 *
 * @example
 * ```tsx
 * <Eyebrow rule>Live data</Eyebrow>
 * ```
 */
export function Eyebrow({ children, rule = false, className, ...rest }: EyebrowProps) {
  // The rule is a CSS pseudo-element rather than a node: it is pure decoration
  // and has no business in the accessibility tree.
  return (
    <span {...rest} className={cx('ainam-eyebrow', rule && 'ainam-eyebrow--rule', className)}>
      {children}
    </span>
  )
}
