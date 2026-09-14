---
category: Time
---

# useCountdown

Reactive countdown timer in seconds

## Usage

```tsx
import { useCountdown } from '@reause/core'

const countdownSeconds = 5
const [remaining, setRemaining, { start, stop, pause, resume }] = useCountdown(countdownSeconds, {
  onComplete() {

  },
  onTick() {

  }
})

start() // begins counting down from 5
setRemaining(10) // jump to 10 on the next render
```

You can use a `ref` to change the initial countdown.
`start()` and `resume()` also accept a new countdown value for the next countdown.

```tsx
import { useCountdown } from '@reause/core'

const countdown = { current: 5 }
const [, , { start, reset }] = useCountdown(countdown)

// change the countdown value
countdown.current = 10

// start a new countdown with 2 seconds
start(2)

// reset the countdown to 4, but do not start it
reset(4)

// start the countdown with the current value of `countdown`
start()
```

## Type Declarations

```ts
export interface UseCountdownOptions {
  /**
   * Countdown interval in milliseconds.
   *
   * @default 1000
   */
  interval?: number
  /**
   * Callback function called when the countdown reaches 0.
   */
  onComplete?: () => void
  /**
   * Callback function called on each tick of the countdown.
   */
  onTick?: () => void
}
export type UseCountdownReturn = readonly [
  /**
   * Current countdown value — plain React state.
   */
  remaining: number,
  /**
   * Update the countdown with the React state protocol: `setRemaining(next)` or `setRemaining(prev
   * => next)`. It writes the internal remaining state directly — there is no Vue-style ref object.
   */
  setRemaining: Dispatch<SetStateAction<number>>,
  controls: {
    /**
     * Resets the countdown to its initial value.
     */
    reset: (countdown?: number) => void
    /**
     * Stops the countdown and resets its state.
     */
    stop: () => void
    /**
     * Resets the countdown and starts it again.
     */
    start: (countdown?: number) => void
    /**
     * Pauses the countdown — the interval is cleared, `remaining` stays put.
     */
    pause: () => void
    /**
     * Resumes a paused countdown; no-op once it has reached 0 or while running.
     */
    resume: () => void
    /**
     * Whether the countdown interval is currently active.
     */
    isActive: boolean
  },
]
/**
 * Map from @vueuse/core `useCountdown`
 * (`source/vueuse/packages/core/useCountdown/`).
 *
 * @example
 * const countdownSeconds = 5
 * const [remaining, setRemaining, { start, stop, pause, resume }] = useCountdown(countdownSeconds)
 *
 * start() // begins counting down from 5
 * setRemaining(10) // jump to 10 on the next render
 */
export declare function useCountdown(
  initialCountdown: number,
  options?: UseCountdownOptions,
): UseCountdownReturn
```
