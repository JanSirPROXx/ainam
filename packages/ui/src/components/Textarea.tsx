import type { TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rows?: number | undefined
  /** Draws the danger hairline and sets `aria-invalid`. Pair with `Field error`. */
  invalid?: boolean | undefined
}

/**
 * Multi-line text field. Same chrome as `Input`; vertical resize only, so a
 * textarea can never stretch past its column.
 *
 * @example
 * ```tsx
 * <Textarea rows={6} placeholder="Body copy for this block…" />
 * ```
 */
export function Textarea({ rows = 4, invalid = false, className, ...rest }: TextareaProps) {
  return (
    <textarea
      {...rest}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx('ainam-textarea', className)}
    />
  )
}
