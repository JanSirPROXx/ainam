import type { HTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import { EMPTY } from '../lib/constants'

/** One crumb in the trail. */
export interface BreadcrumbItem {
  label: string
  /** Renders the crumb as a link. Without it the crumb is plain text. */
  href?: string | undefined
}

export interface BreadcrumbProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /**
   * A bare string is shorthand for `{ label: s }`. The last item is the
   * current page: it is never a link, whether or not it carries an `href`.
   */
  items?: Array<string | BreadcrumbItem> | undefined
}

/**
 * Path trail above a detail view. The separator is a mono forward slash,
 * because AINAM content keys are slash-paths.
 *
 * @example
 * ```tsx
 * <Breadcrumb items={['acme-web', { label: 'Collections', href: '/collections' }, 'Landing page']} />
 * ```
 */
export function Breadcrumb({ items = EMPTY, className, ...rest }: BreadcrumbProps) {
  const crumbs = items.map(toCrumb)

  return (
    <nav aria-label="Breadcrumb" {...rest} className={cx('ainam-breadcrumb', className)}>
      <ol className="ainam-breadcrumb__list">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1
          return (
            // A trail is positional and never reorders, and two crumbs can carry
            // the same label, so position is the only real identity here.
            // oxlint-disable-next-line no-array-index-key
            <li key={`${crumb.label}-${index}`} className="ainam-breadcrumb__item">
              {crumb.href && !current ? (
                <a className="ainam-breadcrumb__crumb" href={crumb.href}>
                  {crumb.label}
                </a>
              ) : (
                <span className="ainam-breadcrumb__crumb" aria-current={current ? 'page' : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function toCrumb(item: string | BreadcrumbItem): BreadcrumbItem {
  return typeof item === 'string' ? { label: item } : item
}
