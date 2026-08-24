import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label?: string
  /** Muted helper text below the control. */
  hint?: string
  /** Replaces `hint` and turns it red. Set `invalid` on the control too. */
  error?: string
  required?: boolean
  /**
   * `id` of the control this labels. It also ids the hint/error as
   * `${htmlFor}-message`, so the control can point at it with
   * `aria-describedby` — a Field cannot set that on a child it does not own.
   */
  htmlFor?: string
  children?: ReactNode
}

/**
 * Label, hint and error wrapper. Every form control in AINAM sits inside a Field.
 *
 * @example
 * ```tsx
 * <Field label="Project slug" hint="Lowercase, no spaces." htmlFor="slug">
 *   <Input id="slug" placeholder="marketing-site" aria-describedby="slug-message" />
 * </Field>
 * ```
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  children,
  className,
  ...rest
}: FieldProps) {
  const message = error || hint

  return (
    <div {...rest} className={cx('ainam-field', className)}>
      {label && (
        <label className="ainam-field__label" htmlFor={htmlFor}>
          {label}
          {/* The control carries `required`; the asterisk is a visual echo of it
              and would otherwise be announced as a stray "star". */}
          {required && (
            <span className="ainam-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {message && (
        <span
          className={cx('ainam-field__message', error && 'ainam-field__message--error')}
          id={htmlFor ? `${htmlFor}-message` : undefined}
        >
          {message}
        </span>
      )}
    </div>
  )
}
