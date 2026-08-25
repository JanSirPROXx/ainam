import { useEffect, useId, useRef } from 'react'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { cx } from '../lib/cx'
import { useFocusTrap, useScrollLock } from '../lib/useFocusTrap'

/** Props for {@link Dialog}. */
export interface DialogProps {
  /** @default true */
  open?: boolean | undefined
  title?: string | undefined
  description?: string | undefined
  children?: ReactNode | undefined
  /** Action row on a darker footer bar, right-aligned. */
  footer?: ReactNode | undefined
  /** Fired by a scrim click or the Escape key. */
  onClose?: () => void | undefined
  /** Max width in px. @default 460 */
  width?: number | undefined
  className?: string | undefined
  style?: CSSProperties | undefined
}

/**
 * Centred modal over a blurred 72%-black scrim. It positions against the
 * nearest positioned ancestor, so it needs a `position: relative` parent.
 *
 * Entrance is a 220ms fade plus a 6px rise — nothing scales in.
 *
 * @example
 * ```tsx
 * <Dialog
 *   title="Delete locale"
 *   description="de-DE and its 412 strings will be removed."
 *   onClose={close}
 *   footer={
 *     <>
 *       <Button variant="ghost" onClick={close}>Cancel</Button>
 *       <Button variant="danger" onClick={remove}>Delete locale</Button>
 *     </>
 *   }
 * />
 * ```
 */
export function Dialog({
  open = true,
  title,
  description,
  children,
  footer,
  onClose,
  width = 460,
  className,
  style,
}: DialogProps) {
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`

  useEffect(() => {
    if (!open || !onClose) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  // aria-modal claims the rest of the page is hidden; the trap is what makes
  // that true for the keyboard as well as for assistive technology.
  useFocusTrap(panel, open)
  useScrollLock(open)

  if (!open) return null

  const closeOnScrim = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose?.()
  }

  const hasHead = Boolean(title || description)

  return (
    <div className="ainam-dialog-scrim" onClick={closeOnScrim}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx('ainam-dialog', className)}
        style={{ maxWidth: width, ...style }}
      >
        {hasHead ? (
          <div className="ainam-dialog__head">
            {title ? (
              <h2 id={titleId} className="ainam-dialog__title">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descriptionId} className="ainam-dialog__description">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        {children ? (
          <div className={cx('ainam-dialog__body', !hasHead && 'ainam-dialog__body--lead')}>
            {children}
          </div>
        ) : null}
        {footer ? <div className="ainam-dialog__foot">{footer}</div> : null}
      </div>
    </div>
  )
}
