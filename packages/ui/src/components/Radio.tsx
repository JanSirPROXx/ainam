import type { InputHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: string
  /** Second, muted line under the label. */
  description?: string
}

/**
 * Single-choice control. Group radios that share a `name` in a flex column with
 * `gap: var(--space-4)`.
 *
 * The dot is near-white on the unchanged input surface — the ring never fills,
 * which is what separates a radio from a checkbox at a glance.
 *
 * @example
 * ```tsx
 * <Radio
 *   name="plan"
 *   value="pro"
 *   checked={plan === 'pro'}
 *   onChange={() => setPlan('pro')}
 *   label="Pro"
 *   description="Unlimited locales."
 * />
 * ```
 */
export function Radio({ label, description, className, style, ...rest }: RadioProps) {
  return (
    <label
      className={cx('ainam-radio', description && 'ainam-radio--stacked', className)}
      style={style}
    >
      <input {...rest} type="radio" className="ainam-radio__input" />
      <span className="ainam-radio__ring" aria-hidden="true">
        <span className="ainam-radio__dot" />
      </span>
      {(label || description) && (
        <span className="ainam-radio__text">
          {label && <span className="ainam-radio__label">{label}</span>}
          {description && <span className="ainam-radio__description">{description}</span>}
        </span>
      )}
    </label>
  )
}
