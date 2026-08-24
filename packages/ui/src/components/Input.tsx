import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export type InputSize = 'sm' | 'md' | 'lg'

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'suffix'> {
  size?: InputSize
  /** Draws the danger hairline and sets `aria-invalid`. Pair with `Field error`. */
  invalid?: boolean
  /** Static mono text inside the left edge, e.g. `"ainam.dev/"`. */
  prefix?: ReactNode
  /** Static mono text inside the right edge, e.g. `"px"`. */
  suffix?: ReactNode
}

/**
 * Single-line text field. Focus adds a 48%-alpha hairline plus a soft ring;
 * there is no coloured focus state.
 *
 * With a `prefix` or `suffix` the chrome moves to a wrapper and the input
 * itself goes transparent, so the affixes sit inside the same border.
 *
 * @example
 * ```tsx
 * <Input placeholder="you@company.com" />
 * <Input prefix="ainam.dev/" defaultValue="acme" size="sm" />
 * ```
 */
export function Input({
  size = 'md',
  invalid = false,
  prefix,
  suffix,
  className,
  style,
  ...rest
}: InputProps) {
  const ariaInvalid = invalid || undefined

  if (prefix || suffix) {
    return (
      <div
        className={cx('ainam-input-group', `ainam-input-group--${size}`, className)}
        style={style}
      >
        {prefix && <span className="ainam-input-group__affix">{prefix}</span>}
        <input {...rest} aria-invalid={ariaInvalid} className="ainam-input-group__control" />
        {suffix && <span className="ainam-input-group__affix">{suffix}</span>}
      </div>
    )
  }

  return (
    <input
      {...rest}
      aria-invalid={ariaInvalid}
      className={cx('ainam-input', `ainam-input--${size}`, className)}
      style={style}
    />
  )
}
