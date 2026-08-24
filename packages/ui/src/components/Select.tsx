import type { SelectHTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import { EMPTY } from '../lib/constants'

export type SelectSize = 'sm' | 'md' | 'lg'

/** A value/label pair. Pass a bare string when the two are the same. */
export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'children'> {
  /** Strings, or `{ value, label }` pairs. */
  options?: Array<string | SelectOption>
  size?: SelectSize
  /** Draws the danger hairline and sets `aria-invalid`. Pair with `Field error`. */
  invalid?: boolean
  /** Rendered as an empty-value first option. */
  placeholder?: string
}

/**
 * Native `<select>` restyled to match `Input`. Used for locale pickers,
 * environment switchers and field types.
 *
 * The native chevron is suppressed and replaced by a mono caret, so the control
 * looks the same on every platform while keeping the OS picker behaviour.
 *
 * @example
 * ```tsx
 * <Select options={['Production', 'Preview', 'Development']} defaultValue="Production" />
 * <Select options={[{ value: 'de-CH', label: 'German (Switzerland)' }]} placeholder="Pick a locale" />
 * ```
 */
export function Select({
  options = EMPTY,
  size = 'md',
  invalid = false,
  placeholder,
  className,
  style,
  ...rest
}: SelectProps) {
  return (
    <div className={cx('ainam-select', className)} style={style}>
      <select
        {...rest}
        aria-invalid={invalid || undefined}
        className={cx('ainam-select__control', `ainam-select__control--${size}`)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const { value, label } = typeof option === 'string' ? { value: option, label: option } : option
          return (
            <option key={value} value={value}>
              {label}
            </option>
          )
        })}
      </select>
      {/* U+25BE, the system's caret. Decorative — the select announces itself. */}
      <span className="ainam-select__caret" aria-hidden="true">
        ▾
      </span>
    </div>
  )
}
