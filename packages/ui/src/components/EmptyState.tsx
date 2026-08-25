import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** What is absent, stated plainly. No apology, no exclamation mark. */
  title: string
  /** One sentence on what the missing thing is for. */
  description?: string | undefined
  /** Usually a single primary Button, labelled verb + object. */
  action?: ReactNode | undefined
  /** A 16px glyph. The component draws the bordered tile around it. */
  icon?: ReactNode | undefined
}

/**
 * Zero-data placeholder for tables, collections and search results. The copy
 * names the next action rather than reporting a failure.
 *
 * The title is a paragraph, not a heading: an empty state drops into a table
 * body or a card whose surrounding heading level is unknown, and a guessed
 * level breaks the document outline for the page that hosts it.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Icon n="database" />}
 *   title="No collections yet"
 *   description="Collections group content by route or component."
 *   action={<Button size="sm">New collection</Button>}
 * />
 * ```
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div {...rest} className={cx('ainam-empty', className)}>
      {icon && (
        <span className="ainam-empty__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="ainam-empty__title">{title}</p>
      {description && <p className="ainam-empty__description">{description}</p>}
      {action && <div className="ainam-empty__action">{action}</div>}
    </div>
  )
}
