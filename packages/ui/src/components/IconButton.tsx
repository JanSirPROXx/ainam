import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export type IconButtonVariant = 'ghost' | 'secondary'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'disabled'> {
  /** A 16px Lucide glyph at 1.5 stroke, drawn in `currentColor`. */
  icon: ReactNode
  /**
   * Accessible name. A glyph carries no text, so this is the only name the
   * control has — it becomes both `aria-label` and the native tooltip.
   */
  label: string
  /**
   * `ghost` shows no chrome until hover. Reach for `secondary` only when the
   * control has to stay visible against a busy surface.
   */
  variant?: IconButtonVariant
  /** Square, matching the control heights: 28 / 34 / 42px. */
  size?: IconButtonSize
  disabled?: boolean
}

/**
 * Square icon-only control for toolbars, table rows and dialog dismissals.
 *
 * Always pass `label` — it is what a screen reader announces and what the
 * hover tooltip shows.
 *
 * @example
 * ```tsx
 * <IconButton icon={<Settings />} label="Settings" />
 * <IconButton icon={<X />} label="Close" variant="secondary" size="sm" />
 * ```
 */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      className={cx(
        'ainam-icon-btn',
        `ainam-icon-btn--${variant}`,
        `ainam-icon-btn--${size}`,
        className,
      )}
      // Set after the spread: `label` is the contract, and must win over an
      // `aria-label` that slipped in through the DOM props.
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}
