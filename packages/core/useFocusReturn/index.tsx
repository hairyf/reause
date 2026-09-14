import { useUpdateEffect } from '@reause/shared'
import { useRef } from 'react'

export interface UseFocusReturnInput {
  /**
   * Whether the overlay (modal, drawer, popover, …) is currently open.
   */
  opened: boolean

  /**
   * Whether focus should be returned once `opened` flips back to `false`.
   *
   * @default true
   */
  shouldReturnFocus?: boolean
}

export type UseFocusReturnReturnValue = () => void

/**
 * Map from @mantine/hooks `useFocusReturn`
 * (`source/mantine/packages/@mantine/hooks/src/use-focus-return/`).
 *
 * @example
 * const returnFocus = useFocusReturn({ opened })
 *
 * // when the overlay closes:
 * returnFocus()
 */
export function useFocusReturn({
  opened,
  shouldReturnFocus = true,
}: UseFocusReturnInput): UseFocusReturnReturnValue {
  const lastActiveElement = useRef<HTMLElement | null>(null)

  // Mirror of upstream's `returnFocus`: restore the snapshotted element, if one
  // was captured and it can actually take focus. `preventScroll` keeps the
  // restore from scrolling the page back to the element (upstream's value).
  const returnFocus = () => {
    const element = lastActiveElement.current
    if (element && 'focus' in element && typeof element.focus === 'function')
      element.focus({ preventScroll: true })
  }

  useUpdateEffect(() => {
    // `-1` is a no-op id for `clearTimeout`, so the cleanup below is safe when
    // neither branch scheduled a timeout (upstream's initial value).
    let timeout = -1

    // A user tabbing away during the closing transition keeps their own focus
    // target: the pending restore is cancelled instead of pulling focus back.
    const clearFocusTimeout = (event: KeyboardEvent) => {
      if (event.key === 'Tab')
        window.clearTimeout(timeout)
    }

    document.addEventListener('keydown', clearFocusTimeout)

    if (opened) {
      lastActiveElement.current = document.activeElement as HTMLElement
    }
    else if (shouldReturnFocus) {
      const activeElementAtClose = document.activeElement
      timeout = window.setTimeout(() => {
        // Restore only when nothing else claimed focus after the close: focus
        // fell back to `null` / `document.body`, or never moved in the first
        // place. Any other active element is a deliberate new target.
        const currentActiveElement = document.activeElement
        if (
          currentActiveElement === null
          || currentActiveElement === document.body
          || currentActiveElement === activeElementAtClose
        ) {
          returnFocus()
        }
      }, 10)
    }

    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('keydown', clearFocusTimeout)
    }
  }, [opened, shouldReturnFocus])

  return returnFocus
}
