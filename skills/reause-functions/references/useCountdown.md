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

### Options

| Option       | Type         | Default | Description                                                 |
| ------------ | ------------ | ------- | ----------------------------------------------------------- |
| `interval`   | `number`     | `1000`  | Countdown interval in milliseconds (reause-only, see below) |
| `onComplete` | `() => void` | —       | Callback function called when the countdown reaches 0       |
| `onTick`     | `() => void` | —       | Callback function called on each tick of the countdown      |

### Return Values

- `remaining` — current countdown value (plain React state; upstream: a shallow ref).
- `setRemaining(next | prev => next)` — writes the countdown state directly, with no `.value` and no Vue-style ref object; the next tick decrements from the written value.
- `controls.reset(countdown?)` — reset the countdown to its initial value.
- `controls.stop()` — stop the countdown and reset its state.
- `controls.start(countdown?)` — reset the countdown and start it again.
- `controls.pause()` — pause the countdown; `remaining` stays put.
- `controls.resume()` — resume a paused countdown (no-op at 0 or while running).
- `controls.isActive` — whether the countdown interval is currently active.

## React divergences

- The return is a React tuple `[remaining, setRemaining, { reset, stop, start, pause, resume, isActive }]` instead of upstream's object: `remaining` is a `number` and `controls.isActive` a `boolean` (no `.value`), and `setRemaining` is the React state setter writing the internal state directly.
- Upstream accepts a `scheduler` option (`UseCountdownOptions extends ConfigurableScheduler`, defaulting to `useIntervalFn(cb, 1000, { immediate: false })`). There is no React equivalent, so `scheduler` is not ported; the reause-only `interval` option sets the tick rate instead (default `1000` ms, matching upstream's default scheduler).
- A plain-number `initialCountdown` is captured once at setup, like upstream's `toValue(initialCountdown)` closure — a later no-arg `start()`/`reset()` keeps using the setup value.
- `start()`/`resume()` begin the interval from event handlers/effects only, so no timers run during SSR.

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
