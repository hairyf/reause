---
category: Utilities
---

# useTimeoutPoll

Use timeout to poll something — it triggers the callback after the last task is done.

## Usage

```tsx
import { useTimeoutPoll } from '@reause/core'
import { useState } from 'react'

const [count, setCount] = useState(0)

async function fetchData() {
  await new Promise(resolve => setTimeout(resolve, 1000))
  setCount(count => count + 1)
}

// Only trigger after last fetch is done
const { isActive, pause, resume } = useTimeoutPoll(fetchData, 1000)
```

## Type Declarations

```ts
type Awaitable<T> = T | Promise<T>
export interface UseTimeoutPollOptions {
  /**
   * Start the timer immediately
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Execute the callback immediately after calling `resume`
   *
   * @default false
   */
  immediateCallback?: boolean
}
export interface Pausable {
  /**
   * `true` while the poll is active
   */
  isActive: boolean
  /**
   * Stop the poll — the pending timeout is cleared and no further runs are
   * scheduled; a callback already in flight still finishes
   */
  pause: () => void
  /**
   * (Re)start the poll — schedules the next run one `interval` later
   */
  resume: () => void
}
/**
 * React port of VueUse's `useTimeoutPoll`.
 *
 * Map from @vueuse/core `useTimeoutPoll`
 * (`source/vueuse/packages/core/useTimeoutPoll/`): a timeout-based poll chain
 * that triggers the callback one `interval` after activation and re-schedules
 * only after the previous run has finished, so a slow poll never overlaps
 * itself. Self-contained `setTimeout` chain (upstream composes
 * `useTimeoutFn`); there is no document-visibility gating in upstream, so
 * none here either.
 *
 * React divergences:
 * - `fn` and `interval` are plain values kept in refs (upstream: closure +
 *   `MaybeRefOrGetter<number>`), so `pause` / `resume` stay referentially
 *   stable and a changing (typically stable) callback identity never restarts
 *   the chain. Like upstream, the `interval` is only read when a run is
 *   scheduled — a changed `interval` does not re-arm the pending timeout,
 *   which keeps its old cadence until the next schedule;
 * - the `isActive` shallow ref becomes a plain boolean state, flipped by
 *   `resume` / `pause` (upstream sets it synchronously during setup);
 * - the setup-time auto `resume()` (`immediate`, client-only) becomes a mount
 *   `useEffect`, and `tryOnScopeDispose(pause)` becomes its cleanup — timers
 *   only ever run inside effects, so SSR renders never touch them;
 * - upstream does not fire the callback synchronously on `resume`: the first
 *   run is scheduled one `interval` after activation. Pass
 *   `immediateCallback: true` to also fire it immediately on (re)activation.
 *
 * @example
 * const { isActive, pause, resume } = useTimeoutPoll(fetchData, 1000)
 */
export declare function useTimeoutPoll(
  fn: () => Awaitable<void>,
  interval: number,
  options?: UseTimeoutPollOptions,
): Pausable
```
