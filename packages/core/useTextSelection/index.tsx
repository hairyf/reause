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
 * (`source/vueuse/packages/core/useTextSelection/`). Reactively track user
 * text selection based on
 * [`Window.getSelection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection).
 *
 * React divergences:
 * - the Vue `computed` refs (`text` / `rects` / `ranges`) and the `shallowRef`
 *   `selection` become plain values in a single `useState` snapshot, replaced
 *   on every `selectionchange` so all members update together and the object
 *   identity stays stable between changes;
 * - upstream reads `window.getSelection()` during setup — here the initial
 *   read happens in the mount effect instead (SSR-safe: render never touches
 *   `window` / `document`, so the server renders the empty snapshot);
 * - the `document` `selectionchange` listener lives in a self-contained `useEffect`;
 * - upstream's `selection.value = null` re-assign trick to force computed
 *   updates is unnecessary — React replaces the whole snapshot.
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
