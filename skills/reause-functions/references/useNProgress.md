---
category: '@Integrations'
---

# useNProgress

Reactive wrapper for [`nprogress`](https://github.com/rstacruz/nprogress).

## Install

```bash
npm i nprogress@^0
```

## Usage

```tsx
import { useNProgress } from '@reause/integrations'

const { isLoading, setIsLoading } = useNProgress()

function toggle() {
  setIsLoading(!isLoading)
}
```

### Passing a progress percentage

You can pass a percentage to indicate where the bar should start from.

```tsx
import { useNProgress } from '@reause/integrations'

const { progress, setProgress } = useNProgress(0.5)

function done() {
  setProgress(1.0)
}
```

> To change the progress percentage, call `setProgress(n)`, where n is a number between 0..1.

### Customization

Just edit [nprogress.css](https://github.com/rstacruz/nprogress/blob/master/nprogress.css) to your liking. Tip: you probably only want to find and replace occurrences of #29d.

You can [configure](https://github.com/rstacruz/nprogress#configuration) it by passing an object as a second parameter.

```tsx
import { useNProgress } from '@reause/integrations'

useNProgress(null, {
  minimum: 0.1,
  // ...
})
```

## Type Declarations

```ts
/**
 * Options forwarded to `nprogress.configure` —.
 */
export type UseNProgressOptions = Partial<NProgressOptions>
export interface UseNProgressReturn {
  /**
   * Current progress percentage (`0..1`), `null` after `remove()`, `1` after `done()` — the
   * plain-state replacement for upstream's `progress` ref. Write through `setProgress`.
   */
  readonly progress: number | null | undefined
  /**
   * Setter for `progress` — the React mapping of upstream's writable `progress` ref. Takes a plain
   * value or a functional updater (like a React `useState` setter, `prev => next`). A `number`
   * result is pushed to `nprogress` once, through the progress effect; a `null` / `undefined`
   * result only clears the state — the bar element is removed through `remove()`.
   */
  readonly setProgress: Dispatch<SetStateAction<number | null | undefined>>
  /**
   * Whether the bar is currently showing — the React replacement for upstream's writable
   * `isLoading` computed: `true` while `progress` is a number below 1. Write through
   * `setIsLoading`.
   */
  readonly isLoading: boolean
  /**
   * Setter half of upstream's writable `isLoading` computed — takes a plain value or a functional
   * updater (like a React `useState` setter, `prev => next`): `setIsLoading(true)` starts the bar,
   * `setIsLoading(false)` completes it.
   */
  readonly setIsLoading: Dispatch<SetStateAction<boolean>>
  /**
   * Show the bar — upstream's `start`.
   */
  readonly start: () => NProgress
  /**
   * Complete the bar (the placebo `done` animation) — upstream's `done`.
   *
   * @param force - show the bar even when it is hidden
   */
  readonly done: (force?: boolean) => NProgress
  /**
   * Reset `progress` to `null` and remove the bar from the DOM — upstream's `remove`.
   */
  readonly remove: () => void
}
/**
 * Map from @vueuse/integrations `useNProgress`
 * (`source/vueuse/packages/integrations/useNProgress/index.ts`).
 *
 * @param currentProgress - initial progress percentage (`0..1`); a changed
 *   plain value re-syncs on the next render
 * @param options - `nprogress.configure` options, applied once on mount
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const { progress, setProgress, isLoading, setIsLoading, done, remove } = useNProgress()
 * setIsLoading(true) // starts the bar, isLoading === true
 * setProgress(0.5) // progress === 0.5, the bar renders at 50%
 * setProgress(prev => (prev ?? 0) + 0.1) // functional updater, like a useState setter
 * done() // progress === 1, isLoading === false
 * remove() // progress === null, the #nprogress element is gone
 */
export declare function useNProgress(
  currentProgress?: number | null | undefined,
  options?: UseNProgressOptions,
): UseNProgressReturn
```
