import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface GridBackdropProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined
  /** Radial white glow from the top edge. Use it once per page, at the top. @default true */
  glow?: boolean | undefined
  /** Masked hairline grid. @default true */
  grid?: boolean | undefined
  /** 3.5% fractal-noise overlay. @default true */
  grain?: boolean | undefined
  /** Grid cell size in px. @default 64 */
  cell?: number | undefined
  /** A number is read as px; a string is passed through. */
  height?: number | string | undefined
}

/**
 * The signature AINAM section background: a hairline grid under a radial
 * falloff mask, a soft glow off the top edge, and a low-opacity grain overlay.
 *
 * This is the only decorative treatment in the system. Set `glow` on the first
 * section of a page and nowhere else — lower sections keep the grid alone.
 *
 * @example
 * ```tsx
 * <GridBackdrop cell={64}><Hero /></GridBackdrop>
 * <GridBackdrop glow={false}><Features /></GridBackdrop>
 * ```
 */
export function GridBackdrop({
  children,
  glow = true,
  grid = true,
  grain = true,
  cell,
  height,
  className,
  style,
  ...rest
}: GridBackdropProps) {
  // The 64px cell default lives in the stylesheet, where it is the --space-11
  // token rather than a loose number.
  const vars = {
    ...style,
    ...(cell === undefined ? null : { '--ainam-backdrop-cell': `${cell}px` }),
    ...(height === undefined ? null : { height: typeof height === 'number' ? `${height}px` : height }),
  } as CSSProperties

  return (
    <div {...rest} className={cx('ainam-backdrop', className)} style={vars}>
      {grid ? <div className="ainam-backdrop__grid" aria-hidden="true" /> : null}
      {glow ? <div className="ainam-backdrop__glow" aria-hidden="true" /> : null}
      {grain ? <div className="ainam-backdrop__grain" aria-hidden="true" /> : null}
      <div className="ainam-backdrop__content">{children}</div>
    </div>
  )
}
