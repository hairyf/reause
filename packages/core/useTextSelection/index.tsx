import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

export interface UseTextSelectionOptions extends ConfigurableWindow { }

export interface UseTextSelectionReturn {
  /** The currently selected text. */
  text: string
  /** Bounding rects of the selected ranges. */
  rects: DOMRect[]
  /** Ranges contained in the selection. */
  ranges: Range[]
  /** The raw `Selection` object, or `null` when unavailable. */
  selection: Selection | null
}

function getRangesFromSelection(selection: Selection) {
  const rangeCount = selection.rangeCount ?? 0
  return Array.from({ length: rangeCount }, (_, i) => selection.getRangeAt(i))
}

/**
 * Map from @vueuse/core `useTextSelection`
 * (`source/vueuse/packages/core/useTextSelection/`).
 *
 * @example
 * const { text, rects, ranges, selection } = useTextSelection()
 */
export function useTextSelection(options: UseTextSelectionOptions = {}): UseTextSelectionReturn {
  const [state, setState] = useState<UseTextSelectionReturn>({
    text: '',
    rects: [],
    ranges: [],
    selection: null,
  })

  useEffect(() => {
    const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
    if (!win)
      return

    const sync = () => {
      const selection = win.getSelection()
      const ranges = selection ? getRangesFromSelection(selection) : []
      setState({
        text: selection?.toString() ?? '',
        rects: ranges.map(range => range.getBoundingClientRect()),
        ranges,
        selection,
      })
    }

    // Mirror upstream's initial `window.getSelection()` read — safe here
    // because effects only run on the client.
    sync()

    win.document.addEventListener('selectionchange', sync, { passive: true })
    return () => {
      win.document.removeEventListener('selectionchange', sync)
    }
  }, [options.window])

  return state
}
