import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

/** Inner padding step. `none` lets a table or code block bleed to the hairline. */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

/** Props for {@link Card}. Any other div attribute is forwarded to the card element. */
export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  children?: ReactNode | undefined
  /** Uppercase mono label above the title. */
  eyebrow?: string | undefined
  /** Rendered as the card's heading, not as a browser tooltip. */
  title?: string | undefined
  description?: string | undefined
  /** Rendered below a hairline divider. */
  footer?: ReactNode | undefined
  /** Swaps the flat hairline for a top-lit gradient hairline. Feature cards only. */
  gradientBorder?: boolean | undefined
  /** Brightens the border on hover. Use when the whole card is a link. */
  interactive?: boolean | undefined
  /** @default "md" */
  padding?: CardPadding | undefined
}

/**
 * The system's container primitive: an ink-900 surface, a 1px alpha hairline, a
 * 12px radius and a top inner highlight in place of a drop shadow.
 *
 * @example
 * ```tsx
 * <Card eyebrow="Live data" title="Bind a collection"
 *   description="Point a component at a query and it updates in place." />
 *
 * <Card padding="none" gradientBorder>
 *   <Table columns={columns} rows={rows} />
 * </Card>
 * ```
 */
export function Card({
  children,
  eyebrow,
  title,
  description,
  footer,
  gradientBorder = false,
  interactive = false,
  padding = 'md',
  className,
  style,
  ...rest
}: CardProps) {
  const card = (
    <div
      {...rest}
      className={cx(
        'ainam-card',
        `ainam-card--pad-${padding}`,
        interactive && 'ainam-card--interactive',
        gradientBorder && 'ainam-card--framed',
        // With a gradient border the frame is the outer box, so a caller's own
        // class and style land there instead — that is where layout applies.
        !gradientBorder && className,
      )}
      style={gradientBorder ? undefined : style}
    >
      <CardHead
        eyebrow={eyebrow}
        title={title}
        description={description}
        spaced={Boolean(children)}
      />
      {children}
      {footer ? <div className="ainam-card__foot">{footer}</div> : null}
    </div>
  )

  if (!gradientBorder) return card

  return (
    <div className={cx('ainam-card-frame', className)} style={style}>
      {card}
    </div>
  )
}

function CardHead({
  eyebrow,
  title,
  description,
  spaced,
}: {
  eyebrow: string | undefined
  title: string | undefined
  description: string | undefined
  spaced: boolean
}) {
  if (!eyebrow && !title && !description) return null

  return (
    <div className={cx('ainam-card__head', spaced && 'ainam-card__head--spaced')}>
      {eyebrow ? <span className="ainam-card__eyebrow">{eyebrow}</span> : null}
      {title ? <h3 className="ainam-card__title">{title}</h3> : null}
      {description ? <p className="ainam-card__description">{description}</p> : null}
    </div>
  )
}
