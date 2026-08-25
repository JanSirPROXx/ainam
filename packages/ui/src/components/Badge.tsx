import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

/**
 * Status tones. This is the one place saturated hue appears in the system, and
 * it appears as a tint behind a saturated foreground — never as a solid fill.
 */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children?: ReactNode | undefined
  /** @default 'neutral' */
  tone?: BadgeTone | undefined
  /** Prepends a dot in the tone colour, for state that is scanned rather than read. */
  dot?: boolean | undefined
}

/**
 * System-owned status label — publish state, environment, sync health.
 *
 * Set in mono because the value is machine-produced. Use {@link Tag} instead for
 * user-authored metadata: tags are rounded, sans and removable.
 *
 * @example
 * ```tsx
 * <Badge tone="success" dot>Published</Badge>
 * <Badge>draft</Badge>
 * ```
 */
export function Badge({ children, tone = 'neutral', dot = false, className, ...rest }: BadgeProps) {
  return (
    <span {...rest} className={cx('ainam-badge', `ainam-badge--${tone}`, className)}>
      {dot && <span className="ainam-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
