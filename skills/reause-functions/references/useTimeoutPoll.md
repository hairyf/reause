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
   * Stop the poll — the pending timeout is cleared and no further runs are scheduled; a callback
   * already in flight still finishes
   */
  pause: () => void
  /**
   * (Re)start the poll — schedules the next run one `interval` later
   */
  resume: () => void
}
/**
 * Map from @vueuse/core `useTimeoutPoll`
 * (`source/vueuse/packages/core/useTimeoutPoll/`).
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
