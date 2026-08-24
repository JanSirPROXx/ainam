import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'disabled'> {
  children?: ReactNode
  /** At most one `primary` per view — everything else is secondary or quieter. */
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: ReactNode
  iconRight?: ReactNode
  disabled?: boolean
  /** Replaces `iconLeft` with a spinner and blocks interaction. */
  loading?: boolean
  fullWidth?: boolean
  /** Render as a link. An `a` still looks and behaves like a button. */
  as?: 'button' | 'a'
  href?: string
}

/**
 * The system's action control.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Create key</Button>
 * <Button variant="danger" iconLeft={<Icon n="trash-2" />}>Delete workspace</Button>
 * ```
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  as = 'button',
  className,
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading
  const classes = cx(
    'ainam-btn',
    `ainam-btn--${variant}`,
    `ainam-btn--${size}`,
    fullWidth && 'ainam-btn--full',
    className,
  )

  if (as === 'a') {
    // An anchor has no `disabled`, so the inactive state is communicated to
    // assistive technology instead of merely looking dimmed.
    return (
      <a
        {...(rest as object)}
        className={classes}
        aria-disabled={inactive || undefined}
        tabIndex={inactive ? -1 : undefined}
      >
        {loading ? <Spinner /> : iconLeft}
        {children}
        {iconRight}
      </a>
    )
  }

  return (
    <button {...rest} type={rest.type ?? 'button'} className={classes} disabled={inactive}>
      {loading ? <Spinner /> : iconLeft}
      {children}
      {iconRight}
    </button>
  )
}

function Spinner() {
  return <span className="ainam-spinner" aria-hidden="true" />
}
