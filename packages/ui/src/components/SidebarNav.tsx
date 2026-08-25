import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { EMPTY } from '../lib/constants'

/** One navigation row. */
export interface NavItemDef {
  id: string
  label: string
  /** 16px Lucide glyph. Decorative — the label carries the meaning. */
  icon?: ReactNode | undefined
  /** Right-aligned node — a Badge, a count, a chevron. */
  trailing?: ReactNode | undefined
}

/** A labelled group of rows. */
export interface NavSection {
  /** Mono uppercase group label. Omit it for an unlabelled group. */
  label?: string | undefined
  items?: NavItemDef[] | undefined
}

export interface SidebarNavProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onSelect'> {
  sections?: NavSection[] | undefined
  /** `id` of the row for the view currently on screen. */
  activeId?: string | undefined
  onSelect?: (id: string) => void | undefined
}

/**
 * App sidebar navigation: mono uppercase section labels over 30px rows. Active
 * rows fill `--surface-active` and go medium weight — there is no left accent bar.
 *
 * Pass an `aria-label` when a page carries more than one nav landmark.
 *
 * @example
 * ```tsx
 * <SidebarNav
 *   activeId={view}
 *   onSelect={setView}
 *   sections={[{ label: 'Workspace', items: [{ id: 'content', label: 'Content' }] }]}
 * />
 * ```
 */
export function SidebarNav({
  sections = EMPTY,
  activeId,
  onSelect,
  className,
  ...rest
}: SidebarNavProps) {
  const groupId = useId()

  return (
    <nav {...rest} className={cx('ainam-sidebar-nav', className)}>
      {sections.map((section, index) => {
        const labelId = section.label ? `${groupId}-${index}` : undefined
        return (
          <div key={section.label ?? index} className="ainam-nav-group">
            {section.label && (
              <span id={labelId} className="ainam-nav-group__label">
                {section.label}
              </span>
            )}
            {/* A list, so assistive technology announces how many rows the group holds. */}
            <ul className="ainam-nav-group__list" aria-labelledby={labelId}>
              {(section.items ?? []).map((item) => (
                <li key={item.id}>
                  <NavItem item={item} active={item.id === activeId} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

interface NavItemProps {
  item: NavItemDef
  active: boolean
  onSelect: ((id: string) => void) | undefined
}

function NavItem({ item, active, onSelect }: NavItemProps) {
  return (
    <button
      type="button"
      className="ainam-nav-item"
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect?.(item.id)}
    >
      {item.icon && (
        <span className="ainam-nav-item__icon" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span className="ainam-nav-item__label">{item.label}</span>
      {item.trailing}
    </button>
  )
}
