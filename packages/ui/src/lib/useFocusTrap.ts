import { type RefObject, useEffect } from 'react'

const TABBABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function tabbableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (element) => element.offsetParent !== null,
  )
}

/**
 * Keeps keyboard focus inside a modal layer and returns it on close.
 *
 * `aria-modal="true"` tells assistive technology the rest of the page is
 * hidden. Without a trap, Tab still walks straight into that hidden content, so
 * a screen-reader user lands on elements their software has been told not to
 * announce — worse than never claiming to be modal. Focus is also restored to
 * whatever opened the layer, so closing a dialog does not dump the user back at
 * the top of the document.
 */
export function useFocusTrap(container: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const element = container.current
    if (!active || !element) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const initial = tabbableWithin(element)[0]
    ;(initial ?? element).focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !element) return
      const items = tabbableWithin(element)
      const first = items[0]
      const last = items[items.length - 1]

      // Nothing focusable inside: keep focus on the panel rather than letting
      // Tab escape into content that is hidden from assistive technology.
      if (!first || !last) {
        event.preventDefault()
        element.focus()
        return
      }

      const current = document.activeElement
      if (event.shiftKey && (current === first || current === element)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    element.addEventListener('keydown', onKeyDown)
    return () => {
      element.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [active, container])
}

/** Stops the page behind a modal layer from scrolling while it is open. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}
