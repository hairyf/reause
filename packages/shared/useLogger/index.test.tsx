import type { MockInstance } from 'vitest'
import { StrictMode, useState } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { useLogger } from '../useLogger'

/**
 * `console.log` is the entire observable surface of this hook, so every case
 * reads the spy's `mock.calls` rather than a rendered node. A mock
 * implementation is installed as well as the spy so a failure's diagnostic
 * output does not flood the browser reporter. The StrictMode case below was
 * pinned by a differential probe that ran this hook and the react-use pin's
 * inline `useEffectOnce`/`useUpdateEffect` composition in the same component and
 * compared every logged pass.
 */
let consoleSpy: MockInstance<typeof console.log>

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  consoleSpy.mockRestore()
})

/** The exact `(message, ...rest)` tuples logged so far, as comparable arrays. */
function logged(): unknown[][] {
  return consoleSpy.mock.calls.map(call => [...call])
}

it('logs mount at mount, update per render, and unmount at unmount, in that order', async () => {
  function TodoList(props: { todos: string[] }) {
    useLogger('TodoList', props.todos)

    return <span>{props.todos.join(', ')}</span>
  }

  const screen = await render(<TodoList todos={['a']} />)

  // exactly one line so far, and it is the mount line with the mount render's
  // arguments
  expect(logged()).toEqual([['TodoList mounted', ['a']]])

  const second = ['a', 'b']

  await screen.rerender(<TodoList todos={second} />)
  expect(logged()).toEqual([
    ['TodoList mounted', ['a']],
    ['TodoList updated', second],
  ])
  // the array logged on update is the argument of the render that logged it
  expect(consoleSpy.mock.calls[1]![1]).toBe(second)

  const third = ['a', 'b', 'c']

  await screen.rerender(<TodoList todos={third} />)
  expect(logged()).toEqual([
    ['TodoList mounted', ['a']],
    ['TodoList updated', second],
    ['TodoList updated', third],
  ])

  await screen.unmount()
  // the unmount line carries no extra arguments — upstream's cleanup closure
  // logs the name only
  expect(logged()).toEqual([
    ['TodoList mounted', ['a']],
    ['TodoList updated', second],
    ['TodoList updated', third],
    ['TodoList unmounted'],
  ])
})

it('forwards every extra argument, spread, in the order given', async () => {
  const first = { id: 1 }
  const second = 'note'

  function Demo() {
    useLogger('Demo', first, second, 3, null)

    return <span>Demo</span>
  }

  const screen = await render(<Demo />)

  expect(logged()).toEqual([['Demo mounted', first, second, 3, null]])

  await screen.unmount()
  // the unmount line still drops them
  expect(logged()).toEqual([
    ['Demo mounted', first, second, 3, null],
    ['Demo unmounted'],
  ])
})

it('logs an update on every re-render after mount, not only when a dependency changes', async () => {
  function Counter() {
    const [count, setCount] = useState(0)

    // no dependency list: `rest` is `[count]`, re-created every render
    useLogger('Counter', count)

    return (
      <div>
        <span>{`count: ${count}`}</span>
        <button onClick={() => setCount(current => current + 1)}>increment</button>
      </div>
    )
  }

  const screen = await render(<Counter />)

  expect(logged()).toEqual([['Counter mounted', 0]])

  await screen.getByRole('button', { name: 'increment' }).click()
  await expect.element(screen.getByText('count: 1')).toBeVisible()
  expect(logged()).toEqual([
    ['Counter mounted', 0],
    ['Counter updated', 1],
  ])

  await screen.getByRole('button', { name: 'increment' }).click()
  await expect.element(screen.getByText('count: 2')).toBeVisible()
  expect(logged()).toEqual([
    ['Counter mounted', 0],
    ['Counter updated', 1],
    ['Counter updated', 2],
  ])

  await screen.unmount()
  expect(logged()).toEqual([
    ['Counter mounted', 0],
    ['Counter updated', 1],
    ['Counter updated', 2],
    ['Counter unmounted'],
  ])
})

it('logs a state-only re-render whose props are unchanged', async () => {
  const props = { label: 'fixed' }

  function Mixed(props: { label: string }) {
    const [, setTick] = useState(0)

    // `props.label` is the same string across both renders, so a port that
    // gated the update line on the arguments changing would log nothing here
    useLogger('Mixed', props.label)

    return <button onClick={() => setTick(current => current + 1)}>tick</button>
  }

  const screen = await render(<Mixed {...props} />)

  expect(logged()).toEqual([['Mixed mounted', 'fixed']])

  await screen.getByRole('button', { name: 'tick' }).click()
  expect(logged()).toEqual([
    ['Mixed mounted', 'fixed'],
    ['Mixed updated', 'fixed'],
  ])

  await screen.unmount()
})

it('logs the bare name when no extra arguments are given', async () => {
  function Bare() {
    useLogger('Bare')

    return <span>bare</span>
  }

  const screen = await render(<Bare />)

  expect(logged()).toEqual([['Bare mounted']])

  await screen.unmount()
  expect(logged()).toEqual([['Bare mounted'], ['Bare unmounted']])
})

it('keeps logging the mount-time name after the argument changes', async () => {
  function Renamed(props: { name: string }) {
    useLogger(props.name)

    return <span>{props.name}</span>
  }

  const screen = await render(<Renamed name="first" />)

  expect(logged()).toEqual([['first mounted']])

  await screen.rerender(<Renamed name="second" />)
  // the mount effect is `useEffect(fn, [])`, so it captured the first render's
  // name; the update effect reads the current render's
  expect(logged()).toEqual([
    ['first mounted'],
    ['second updated'],
  ])

  await screen.unmount()
  // the cleanup is the first render's closure too
  expect(logged()).toEqual([
    ['first mounted'],
    ['second updated'],
    ['first unmounted'],
  ])
})

it('follows upstream\'s <StrictMode> timing, measured against the pin', async () => {
  function Strict() {
    useLogger('Strict', 'value')

    return <span>strict</span>
  }

  const screen = await render(
    <StrictMode>
      <Strict />
    </StrictMode>,
  )

  // Measured, not assumed: a differential probe rendered this hook and the
  // pin's inline composition in the same component — the two sequences were
  // identical pass for pass. React 19 StrictMode runs the mount effects, the
  // update effects, then the mount cleanups, then the mount effects again
  // (effect → effect → cleanup → effect), and because `useUpdateEffect`'s
  // first-render ref is flipped during the render phase (facebook/react#24527)
  // the committed mount render already reads `false`, so the update line fires
  // at mount on *both* passes. Upstream react-use logs exactly the same thing.
  expect(logged()).toEqual([
    ['Strict mounted', 'value'],
    ['Strict updated', 'value'],
    ['Strict unmounted'],
    ['Strict mounted', 'value'],
    ['Strict updated', 'value'],
  ])

  await screen.unmount()
  expect(logged()).toEqual([
    ['Strict mounted', 'value'],
    ['Strict updated', 'value'],
    ['Strict unmounted'],
    ['Strict mounted', 'value'],
    ['Strict updated', 'value'],
    ['Strict unmounted'],
  ])
})
