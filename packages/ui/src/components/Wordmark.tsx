import type { CSSProperties, HTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export interface WordmarkProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** Cap height in px. @default 16 */
  size?: number | undefined
  /** Colour of the mark itself. The suffix always stays `--text-faint`. @default `var(--text-primary)` */
  color?: string | undefined
  /** Lockup suffix in sans, e.g. `Docs` or `Studio`. */
  suffix?: string | undefined
}

/**
 * The AINAM wordmark, for headers, footers and slide corners.
 *
 * No logo files were supplied, so the mark is typographic: Geist Mono 500,
 * uppercase, 0.18em tracking. Never substitute drawn artwork, and never set it
 * heavier than 500.
 *
 * @example
 * ```tsx
 * <Wordmark size={16} />
 * <Wordmark size={16} suffix="Docs" />
 * ```
 */
export function Wordmark({ size, color, suffix, className, style, ...rest }: WordmarkProps) {
  // Both defaults live in the stylesheet, so the lockup is correct even when the
  // class is used without this component. Every proportion — the gap, the suffix
  // size — is calc()'d off the one size variable.
  const vars = {
    ...style,
    ...(size === undefined ? null : { '--ainam-wordmark-size': `${size}px` }),
    ...(color === undefined ? null : { '--ainam-wordmark-color': color }),
  } as CSSProperties

  return (
    <span {...rest} className={cx('ainam-wordmark', className)} style={vars}>
      <span className="ainam-wordmark__mark">AINAM</span>
      {suffix ? <span className="ainam-wordmark__suffix">{suffix}</span> : null}
    </span>
  )
}
