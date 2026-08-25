import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { cx } from '../lib/cx'
import { EMPTY } from '../lib/constants'

export interface TableColumn {
  /** Property this column reads off each row object. */
  key: string
  label: string
  /** Right-align numeric columns only. @default 'left' */
  align?: 'left' | 'right' | 'center' | undefined
  /** Passed through as a CSS width; a number is read as pixels. */
  width?: number | string | undefined
  /** Set the cell in mono at caption size — ids, content keys, timestamps. */
  mono?: boolean | undefined
  /** Set the cell in `--text-muted`, for values that support rather than carry. */
  muted?: boolean | undefined
}

/** One row. Cell values may be nodes, so a cell can hold a `Badge` or a `Tag`. */
export type TableRow = Record<string, ReactNode>

export interface TableProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  columns?: TableColumn[] | undefined
  rows?: TableRow[] | undefined
  /** Makes rows interactive: pointer cursor, hover tint, keyboard activation. */
  onRowClick?: (row: TableRow, index: number) => void | undefined
  /** @default 'No records' */
  emptyLabel?: string | undefined
}

/**
 * Data table for content entries, locales, API keys and events.
 *
 * Header is a mono uppercase eyebrow; rows are separated by 6%-alpha hairlines.
 * Put it in a `Card` with `padding="none"` so rows bleed to the card edge.
 *
 * @example
 * ```tsx
 * <Table
 *   columns={[
 *     { key: 'contentKey', label: 'Key', mono: true },
 *     { key: 'status', label: 'Status' },
 *     { key: 'requests', label: 'Requests', align: 'right' },
 *   ]}
 *   rows={[{ contentKey: 'hero.title', status: <Badge tone="success" dot>live</Badge>, requests: '1,412' }]}
 *   onRowClick={(row) => open(row)}
 * />
 * ```
 */
export function Table({
  columns = EMPTY,
  rows = EMPTY,
  onRowClick,
  emptyLabel = 'No records',
  className,
  ...rest
}: TableProps) {
  return (
    <div {...rest} className={cx('ainam-table-scroll', className)}>
      <table className={cx('ainam-table', onRowClick && 'ainam-table--clickable')}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={alignClass(column)}
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length || 1} className="ainam-table__empty">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const activate = onRowClick ? () => onRowClick(row, index) : undefined
              return (
                <tr
                  key={rowKey(row, index)}
                  onClick={activate}
                  onKeyDown={activate && ((event) => activateOnKey(event, activate))}
                  tabIndex={activate ? 0 : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={bodyCellClass(column)}>
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function alignClass({ align }: TableColumn) {
  return align && align !== 'left' ? `ainam-table__col--${align}` : undefined
}

function bodyCellClass(column: TableColumn) {
  return cx(
    alignClass(column),
    column.mono && 'ainam-table__col--mono',
    column.muted && 'ainam-table__col--muted',
  )
}

/** Prefer a row's own id so React keeps identity across a re-sort. */
function rowKey(row: TableRow, index: number) {
  const id = row.id
  return typeof id === 'string' || typeof id === 'number' ? id : index
}

/**
 * A clickable `tr` cannot be a `button` without breaking table semantics, so it
 * carries the keyboard contract itself: Enter and Space activate, and Space is
 * prevented from scrolling the page.
 */
function activateOnKey(event: KeyboardEvent<HTMLTableRowElement>, activate: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  activate()
}
