import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../lib/cx'

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Mono micro type — keep it to a few words; the bubble never wraps. */
  label: string
  /** The trigger. It must carry its own accessible name. */
  children?: ReactNode | undefined
  side?: TooltipSide | undefined
}

/**
 * Hover hint for icon buttons and truncated keys. Fades in over 140ms with no
 * movement, and appears on keyboard focus as well as hover.
 *
 * The label supplements the trigger, it does not name it: give the trigger an
 * accessible name of its own (`IconButton`'s `label`, or `aria-label`), or a
 * screen reader announces nothing.
 *
 * @example
 * ```tsx
 * <Tooltip label="Copy content key">
 *   <IconButton icon={<Icon n="copy" />} label="Copy" variant="secondary" />
 * </Tooltip>
 * ```
 */
export function Tooltip({ label, children, side = 'top', className, ...rest }: TooltipProps) {
  const labelId = useId()

  return (
    <span {...rest} className={cx('ainam-tooltip', className)} aria-describedby={labelId}>
      {children}
      <span
        id={labelId}
        role="tooltip"
        className={cx('ainam-tooltip__bubble', `ainam-tooltip__bubble--${side}`)}
      >
        {label}
      </span>
    </span>
  )
}
