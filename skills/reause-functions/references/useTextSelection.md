---
category: Sensors
---

# useTextSelection

Reactively track user text selection based on [`Window.getSelection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection)

## Usage

```tsx
import { useTextSelection } from '@reause/core'

const { text, rects, ranges, selection } = useTextSelection()
```

## Type Declarations

```ts
export interface UseTextSelectionOptions extends ConfigurableWindow {}
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
/**
 * Map from @vueuse/core `useTextSelection`
 * (`source/vueuse/packages/core/useTextSelection/`).
 *
 * @example
 * const { text, rects, ranges, selection } = useTextSelection()
 */
export declare function useTextSelection(
  options?: UseTextSelectionOptions,
): UseTextSelectionReturn
```
