import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export type SwitchSize = 'sm' | 'md'

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'children'> {
  checked?: boolean | undefined
  defaultChecked?: boolean | undefined
  disabled?: boolean | undefined
  /** Receives the next boolean, not an event. */
  onChange?: (next: boolean) => void | undefined
  label?: string | undefined
  size?: SwitchSize | undefined
}

/**
 * Toggle for settings that take effect immediately — no Save button. Use
 * `Checkbox` inside forms that need saving.
 *
 * The knob travels; nothing scales or bounces.
 *
 * @example
 * ```tsx
 * <Switch label="Draft mode" defaultChecked onChange={(next) => setDraft(next)} />
 * ```
 */
export function Switch({
  onChange,
  label,
  size = 'md',
  className,
  style,
  ...rest
}: SwitchProps) {
  // A checkbox with role="switch" rather than a div: it is keyboard-operable,
  // participates in forms, and holds the uncontrolled state itself, so the
  // track and knob can follow `:checked` in CSS.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.checked)

  return (
    <label className={cx('ainam-switch', `ainam-switch--${size}`, className)} style={style}>
      <input
        {...rest}
        type="checkbox"
        role="switch"
        className="ainam-switch__input"
        onChange={handleChange}
      />
      <span className="ainam-switch__track" aria-hidden="true">
        <span className="ainam-switch__knob" />
      </span>
      {label && <span className="ainam-switch__label">{label}</span>}
    </label>
  )
}
