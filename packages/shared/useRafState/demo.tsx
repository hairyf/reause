import { useRafState } from '@reause/shared'
import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Five updates, each dispatched from its own task a couple of milliseconds
 * apart. They all land inside one animation frame — the case `useRafState`
 * collapses into a single commit, while the plain `useState` row next to it
 * commits once per update.
 */
const BURST_VALUES = [1, 2, 3, 4, 5]

function scheduleBurst(apply: (value: number) => void) {
  return BURST_VALUES.map((value, index) =>
    // block body on purpose: every timer callback in this repo stays
    // block-bodied, because `e18e/prefer-timer-args` autofixes a concise arrow
    // into `setTimeout(fn, delay, ...args)` — which evaluates the arguments
    // eagerly and silently inverts a ref-reading callback
    setTimeout(() => {
      apply(value)
    }, index * 2),
  )
}

function RafBurst({ burst }: { burst: number }) {
  const [value, setRafValue] = useRafState(0)
  const renders = useRef(0)
  renders.current += 1

  useLayoutEffect(() => {
    if (burst === 0)
      return
    // start counting from the burst: a layout effect runs before the browser
    // paints and before any timer below can fire, so the reset is what the user
    // sees for the burst's own commits
    renders.current = 0
    const timers = scheduleBurst(setRafValue)
    return () => timers.forEach(timer => clearTimeout(timer))
  }, [burst])

  return (
    <p>
      <code>useRafState</code>
      {' → '}
      <strong>{value}</strong>
      {' · commits caused by the burst: '}
      <strong>{renders.current}</strong>
    </p>
  )
}

function PlainBurst({ burst }: { burst: number }) {
  const [value, setPlainValue] = useState(0)
  const renders = useRef(0)
  renders.current += 1

  useLayoutEffect(() => {
    if (burst === 0)
      return
    renders.current = 0
    const timers = scheduleBurst(setPlainValue)
    return () => timers.forEach(timer => clearTimeout(timer))
  }, [burst])

  return (
    <p>
      <code>useState</code>
      {' → '}
      <strong>{value}</strong>
      {' · commits caused by the burst: '}
      <strong>{renders.current}</strong>
    </p>
  )
}

export default function UseRafStateDemo() {
  const [burst, setBurst] = useState(0)

  return (
    <div>
      <RafBurst burst={burst} />
      <PlainBurst burst={burst} />
      <button onClick={() => setBurst(count => count + 1)}>
        schedule a burst of 5 updates
      </button>
    </div>
  )
}
