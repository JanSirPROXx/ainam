import { useState, type HTMLAttributes, type KeyboardEvent } from 'react'
import { cx } from '../lib/cx'
import { EMPTY } from '../lib/constants'

/** A single tab. */
export interface TabItem {
  value: string
  label: string
  /**
   * Machine-produced count shown beside the label in mono.
   * Rendered by the `underline` variant only — `segmented` is a compact
   * filter and carries labels alone.
   */
  count?: number | undefined
}

/** `underline` for page-level nav, `segmented` for in-panel filters. */
export type TabsVariant = 'underline' | 'segmented'

export interface TabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue' | 'onChange'> {
  /** A bare string is shorthand for `{ value: s, label: s }`. */
  items?: Array<string | TabItem> | undefined
  /** Controlled selection. Pair it with `onChange`. */
  value?: string | undefined
  /** Uncontrolled starting selection. Defaults to the first item. */
  defaultValue?: string | undefined
  onChange?: (value: string) => void | undefined
  variant?: TabsVariant | undefined
}

/**
 * Section switcher. The active underline is a 1px near-white rule, never a
 * coloured bar.
 *
 * @example
 * ```tsx
 * <Tabs
 *   items={[{ value: 'content', label: 'Content', count: 1412 }, { value: 'locales', label: 'Locales' }]}
 *   onChange={setView}
 * />
 * <Tabs variant="segmented" items={['24h', '7d', '30d']} defaultValue="7d" />
 * ```
 */
export function Tabs({
  items = EMPTY,
  value,
  defaultValue,
  onChange,
  variant = 'underline',
  className,
  ...rest
}: TabsProps) {
  const tabs = items.map(toTab)
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? tabs[0]?.value)
  const active = value ?? uncontrolled

  const select = (next: string) => {
    if (value === undefined) setUncontrolled(next)
    onChange?.(next)
  }

  // Selection follows focus, as the ARIA tabs pattern prescribes for cheap
  // panels: a keyboard user never lands on a focused-but-unselected tab.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = tabs.findIndex((tab) => tab.value === active)
    const to = adjacentIndex(event.key, from, tabs.length)
    if (to === null) return
    const target = tabs[to]
    if (!target) return
    event.preventDefault()
    select(target.value)
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to]?.focus()
  }

  return (
    <div
      {...rest}
      role="tablist"
      className={cx('ainam-tabs', `ainam-tabs--${variant}`, className)}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const selected = tab.value === active
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            // Roving tabindex: the list is one tab stop, arrow keys move within it.
            tabIndex={selected ? 0 : -1}
            className="ainam-tab"
            onClick={() => select(tab.value)}
          >
            {tab.label}
            {variant === 'underline' && tab.count !== undefined && (
              <span className="ainam-tab__count">{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function toTab(item: string | TabItem): TabItem {
  return typeof item === 'string' ? { value: item, label: item } : item
}

/** Horizontal traversal for a tablist. Wraps at both ends; null means "not a nav key". */
function adjacentIndex(key: string, from: number, count: number): number | null {
  if (count === 0) return null
  if (key === 'ArrowRight') return (from + 1) % count
  if (key === 'ArrowLeft') return (from - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}
