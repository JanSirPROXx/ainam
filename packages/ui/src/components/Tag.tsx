import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children?: ReactNode
  /** Renders a remove affordance. Omit it for read-only tags. */
  onRemove?: () => void
}

/**
 * Pill for user-authored metadata — content tags, locales, collections.
 *
 * Distinct from {@link Badge}: tags are rounded, sans and often removable;
 * badges are square, mono and system-owned.
 *
 * @example
 * ```tsx
 * <Tag onRemove={() => drop('en-GB')}>en-GB</Tag>
 * <Tag>Marketing</Tag>
 * ```
 */
export function Tag({ children, onRemove, className, ...rest }: TagProps) {
  return (
    <span {...rest} className={cx('ainam-tag', onRemove && 'ainam-tag--removable', className)}>
      {children}
      {onRemove && (
        <button type="button" className="ainam-tag__remove" onClick={onRemove} aria-label="Remove">
          <span aria-hidden="true">×</span>
        </button>
      )}
    </span>
  )
}
