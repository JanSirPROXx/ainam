import type { HTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export type ToastTone = 'success' | 'error' | 'info'

/** Mono marks, not icons: anything the machine reports is set in the mono face. */
const TONE_GLYPH: Record<ToastTone, string> = {
  success: '✓',
  error: '×',
  info: '•',
}

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  title: string
  /** One line of detail. Prefer a specific, unrounded number over a vague one. */
  description?: string | undefined
  /** Carried by the glyph and its colour, never by a coloured bar or fill. */
  tone?: ToastTone | undefined
  /** Omit for a toast the caller retires on a timer instead. */
  onDismiss?: () => void | undefined
}

/**
 * Transient confirmation after a save, publish or sync. Stack them
 * bottom-right with `gap: var(--space-4)`.
 *
 * Screen readers announce a live region only if it is already in the document
 * when its text changes, so mount the stack container once and add toasts to
 * it — do not mount the container together with the first toast.
 *
 * @example
 * ```tsx
 * <Toast
 *   tone="success"
 *   title="Published to production"
 *   description="412 strings synced in 1.2s"
 *   onDismiss={close}
 * />
 * ```
 */
export function Toast({
  title,
  description,
  tone = 'info',
  onDismiss,
  className,
  ...rest
}: ToastProps) {
  return (
    <div
      {...rest}
      className={cx('ainam-toast', `ainam-toast--${tone}`, className)}
      // `alert` interrupts, `status` waits for a pause. A failed publish is
      // worth the interruption; a successful one is not.
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="ainam-toast__glyph" aria-hidden="true">
        {TONE_GLYPH[tone]}
      </span>
      <div className="ainam-toast__body">
        <span className="ainam-toast__title">{title}</span>
        {description && <span className="ainam-toast__description">{description}</span>}
      </div>
      {onDismiss && (
        <button
          type="button"
          className="ainam-toast__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          {'×'}
        </button>
      )}
    </div>
  )
}
