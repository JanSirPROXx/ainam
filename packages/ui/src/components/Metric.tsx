import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

/** Colours the delta. `neutral` stays achromatic — a change is not a status. */
export type MetricDeltaTone = 'up' | 'down' | 'neutral'

export interface MetricProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: string
  value: ReactNode
  /** Mono delta string. Specific and unrounded: `+12.4%`, not `up a bit`. */
  delta?: string | undefined
  /** @default 'neutral' */
  deltaTone?: MetricDeltaTone | undefined
  /** Muted caption below the value. */
  hint?: string | undefined
}

/**
 * Single KPI readout for a dashboard header strip.
 *
 * The value is display-sm, the label a mono eyebrow — the one uppercase in the
 * system. Lay four across a grid with hairline dividers between them.
 *
 * @example
 * ```tsx
 * <Metric
 *   label="Requests / 24h"
 *   value="184,220"
 *   delta="+12.4%"
 *   deltaTone="up"
 *   hint="Across 3 environments"
 * />
 * ```
 */
export function Metric({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  hint,
  className,
  ...rest
}: MetricProps) {
  return (
    <div {...rest} className={cx('ainam-metric', className)}>
      <span className="ainam-metric__label">{label}</span>
      <div className="ainam-metric__row">
        <span className="ainam-metric__value">{value}</span>
        {delta && (
          <span className={cx('ainam-metric__delta', `ainam-metric__delta--${deltaTone}`)}>
            {delta}
          </span>
        )}
      </div>
      {hint && <span className="ainam-metric__hint">{hint}</span>}
    </div>
  )
}
