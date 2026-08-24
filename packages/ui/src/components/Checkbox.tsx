import type { InputHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: string
  /** Second, muted line under the label. */
  description?: string
}

/**
 * Checkbox with an optional description line. The checked state fills
 * near-white; the tick is the only thing drawn on the accent.
 *
 * Works controlled (`checked` + `onChange`) or uncontrolled (`defaultChecked`):
 * the real input holds the state, so the box follows it in CSS.
 *
 * @example
 * ```tsx
 * <Checkbox
 *   label="Publish on save"
 *   description="Content goes live the moment you commit a change."
 *   defaultChecked
 * />
 * ```
 */
export function Checkbox({ label, description, className, style, ...rest }: CheckboxProps) {
  return (
    <label
      className={cx('ainam-checkbox', description && 'ainam-checkbox--stacked', className)}
      style={style}
    >
      <input {...rest} type="checkbox" className="ainam-checkbox__input" />
      <span className="ainam-checkbox__box" aria-hidden="true">
        <svg className="ainam-checkbox__check" viewBox="0 0 10 10" fill="none">
          <path
            d="M1.5 5.2 3.9 7.5 8.5 2.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {(label || description) && (
        <span className="ainam-checkbox__text">
          {label && <span className="ainam-checkbox__label">{label}</span>}
          {description && <span className="ainam-checkbox__description">{description}</span>}
        </span>
      )}
    </label>
  )
}
