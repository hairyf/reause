import type { QueueMethods } from '../useQueue'
import { StrictMode, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useQueue } from '../useQueue'

/**
 * Mirrors react-use's `source/react-use/tests/useQueue.test.ts` — all three of
 * its cases (initial state, `add`, `remove`) are reproduced, and the extra cases
 * pin the parts of the contract the issue calls out: the **synchronous return of
 * `remove()`** and every measured case where it is *not* produced, the lazily
 * evaluated `first` / `last` / `size` getters, the deliberately unstable
 * identity of the returned object, the StrictMode double-invocation of the
 * updater, and SSR.
 *
 * Upstream drives its cases with `@testing-library/react-hooks`; this port uses
 * `vitest-browser-react`, the repo's browser project, exactly as the sibling
 * ports do.
 *
 * **The `remove()` return value is a measured property of React, not a promise
 * of this hook.** The pin produces it by assigning to a closure variable inside
 * the `setState` updater, so a value only exists when React evaluates that
 * updater **eagerly**. React 19.2.8 does so on exactly one path — in both the
 * development and the production dispatcher, gated on the hook's fiber and its
 * alternate having **no pending lanes**
 * (`react-dom/cjs/react-dom-client.development.js:9143-9147`) — and every other
 * path queues the updater for the next render, long after `remove()` has
 * returned. The cases below are the ones measured in chromium against this
 * implementation: the item comes back on a freshly mounted, idle fiber, and
 * `undefined` comes back in the four documented situations. None of this is
 * invented here — the pin behaves identically — but it is easy to state the
 * wrong contract, so it is pinned case by case.
 */
describe('useQueue', () => {
  it('is defined', () => {
    expect(useQueue).toBeDefined()
  })

  it('declares the pin\'s signature — `(initialValue?: T[]) => QueueMethods<T>`', () => {
    // `expectTypeOf` takes a value, so assert on the *function* rather than on a
    // call — invoking the hook outside a component would be an invalid hook
    // call at runtime.
    expectTypeOf(useQueue<number>).returns.toEqualTypeOf<QueueMethods<number>>()
    expectTypeOf<QueueMethods<number>['add']>().toEqualTypeOf<(item: number) => void>()
    // Upstream declares `remove` as `() => T` even though an empty queue (and
    // the non-eager paths below) hand back `undefined`; the pin's type is kept
    // and not narrowed, so this is asserted rather than "corrected".
    expectTypeOf<QueueMethods<number>['remove']>().toEqualTypeOf<() => number>()
    expectTypeOf<QueueMethods<number>['first']>().toEqualTypeOf<number>()
    expectTypeOf<QueueMethods<number>['last']>().toEqualTypeOf<number>()
    expectTypeOf<QueueMethods<number>['size']>().toEqualTypeOf<number>()
  })

  it('takes initial state', async () => {
    const hook = await renderHook(() => useQueue([1, 2, 3]))
    const { first, last, size } = hook.result.current

    expect(first).toBe(1)
    expect(last).toBe(3)
    expect(size).toBe(3)
  })

  it('defaults to an empty queue', async () => {
    const hook = await renderHook(() => useQueue<number>())
    const { first, last, size } = hook.result.current

    expect(first).toBeUndefined()
    expect(last).toBeUndefined()
    expect(size).toBe(0)
  })

  it('appends new member', async () => {
    const hook = await renderHook(() => useQueue([1, 2]))
    await hook.act(() => {
      hook.result.current.add(3)
    })
    const { first, last, size } = hook.result.current

    expect(first).toBe(1)
    expect(last).toBe(3)
    expect(size).toBe(3)
  })

  it('pops oldest member', async () => {
    const hook = await renderHook(() => useQueue([1, 2]))
    await hook.act(() => {
      hook.result.current.remove()
    })
    const { first, last, size } = hook.result.current

    expect(first).toBe(2)
    expect(last).toBe(2)
    expect(size).toBe(1)
  })

  it('remove() returns the removed item synchronously on an idle queue', async () => {
    const hook = await renderHook(() => useQueue([1, 2, 3]))
    let returned: unknown

    await hook.act(() => {
      returned = hook.result.current.remove()
    })

    // The value exists because React evaluated the updater inside the dispatch
    // itself: this is the first dispatch on a freshly mounted fiber, which is
    // the fast path described in the file comment. It is asserted *outside* the
    // `act` callback as well, so the assertion is not satisfied by a lazy read.
    expect(returned).toBe(1)
    expect(hook.result.current.first).toBe(2)
    expect(hook.result.current.last).toBe(3)
    expect(hook.result.current.size).toBe(2)
  })

  it('remove() returns undefined for a second call in the same handler', async () => {
    const hook = await renderHook(() => useQueue([1, 2, 3]))
    let firstReturn: unknown
    let secondReturn: unknown

    await hook.act(() => {
      firstReturn = hook.result.current.remove()
      secondReturn = hook.result.current.remove()
    })

    // Measured: 1 and undefined. The first dispatch consumes the idle fiber (it
    // schedules a lane), so the second dispatch skips the eager evaluation and
    // `return result` runs before the updater ever does. Both removals still
    // apply — the updater runs for the queued render.
    expect([firstReturn, secondReturn]).toEqual([1, undefined])
    expect(hook.result.current.first).toBe(3)
    expect(hook.result.current.size).toBe(1)
  })

  it('remove() returns undefined after an add() in the same handler', async () => {
    const hook = await renderHook(() => useQueue([1, 2, 3]))
    let returned: unknown

    await hook.act(() => {
      hook.result.current.add(4)
      returned = hook.result.current.remove()
    })

    // `add` is dispatched first and takes the eager path for itself, so the
    // `remove` right behind it has none: it returns undefined while still
    // removing the head. Measured queue afterwards: [2, 3, 4].
    expect(returned).toBeUndefined()
    expect(hook.result.current.first).toBe(2)
    expect(hook.result.current.last).toBe(4)
    expect(hook.result.current.size).toBe(3)
  })

  it('remove() returns undefined once this component\'s own update has committed', async () => {
    const returns: unknown[] = []

    function Demo() {
      const queue = useQueue([1, 2, 3])
      return (
        <button
          data-testid="remove"
          onClick={() => {
            returns.push(queue.remove())
          }}
        >
          remove
        </button>
      )
    }

    const screen = await render(<Demo />)
    const button = screen.getByTestId('remove')

    await button.click()
    await vi.waitFor(() => expect(returns.length).toBe(1))
    await button.click()
    await vi.waitFor(() => expect(returns.length).toBe(2))
    await button.click()
    await vi.waitFor(() => expect(returns.length).toBe(3))

    // Real event handlers, real commits: only the first click sees an idle
    // fiber. Each click still removes exactly one item — the mutation is never
    // lost, only the return value is. (A parent-driven or props-only re-render
    // *does* restore the eager path; this component's own state update does
    // not, and no re-render at all does not either.)
    expect(returns).toEqual([1, undefined, undefined])
  })

  it('an empty queue returns undefined from remove() instead of throwing', async () => {
    const hook = await renderHook(() => useQueue<number>([]))
    let returned: unknown
    let threw: unknown

    await hook.act(() => {
      try {
        returned = hook.result.current.remove()
      }
      catch (error) {
        threw = error
      }
    })

    expect(threw).toBeUndefined()
    expect(returned).toBeUndefined()
    expect(hook.result.current.size).toBe(0)
  })

  it('first / last / size are evaluated against the state of the render that produced the object', async () => {
    const hook = await renderHook(() => useQueue([1, 2, 3]))
    const before = hook.result.current

    expect([before.first, before.last, before.size]).toEqual([1, 3, 3])

    await hook.act(() => {
      hook.result.current.add(4)
    })

    // The fresh object tracks the committed state …
    expect([hook.result.current.first, hook.result.current.last, hook.result.current.size]).toEqual([1, 4, 4])
    // … while the object captured before the commit still answers from the
    // render that created it. That is the pin's shape: `first` / `last` / `size`
    // are lazily evaluated getters over that render's `state`, not functions and
    // not a live view of the queue.
    expect([before.first, before.last, before.size]).toEqual([1, 3, 3])
  })

  it('re-creates the returned object and its methods on every render (unstable identity by design)', async () => {
    const hook = await renderHook(() => useQueue([1, 2, 3]))
    const before = hook.result.current
    const beforeAdd = hook.result.current.add

    await hook.act(() => {
      hook.result.current.add(4)
    })

    // Upstream builds a fresh object literal per render and so does this port:
    // no `useMemo`, `useCallback` or ref holds it, and it must not be used as an
    // effect / memo dependency. This is the deliberate opposite of the sibling
    // `useList` port, whose action set is referentially stable on purpose.
    expect(before).not.toBe(hook.result.current)
    expect(beforeAdd).not.toBe(hook.result.current.add)
  })

  it('reads the initial value only on the first render', async () => {
    const hook = await renderHook((initial?: number[]) => useQueue(initial), { initialProps: [1, 2, 3] })

    expect(hook.result.current.size).toBe(3)

    await hook.rerender([9, 9])

    // `useState`'s initial argument, so a later change is ignored — upstream
    // passes `initialValue` straight to `useState` in the same way.
    expect([hook.result.current.first, hook.result.current.last, hook.result.current.size]).toEqual([1, 3, 3])
  })

  describe('react StrictMode', () => {
    /**
     * Differential probe: the pin's `remove` copied verbatim into a local hook,
     * instrumented to count updater invocations, rendered under the *same*
     * `<StrictMode>` as the port. Both get their own fiber (two roots), so each
     * one's first dispatch still takes the eager path and the comparison is
     * like for like.
     */
    const updaterCalls: string[] = []
    function useReplica() {
      const [state, set] = useState([1, 2, 3])
      return {
        state,
        remove: () => {
          let result
          set(([first, ...rest]) => {
            updaterCalls.push(`updater(first=${String(first)})`)
            result = first
            return rest
          })
          return result
        },
      }
    }

    it('double-invokes the updater yet the closure capture stays idempotent', async () => {
      updaterCalls.length = 0
      const replica = await renderHook(() => useReplica(), { wrapper: StrictMode })
      const port = await renderHook(() => useQueue([1, 2, 3]), { wrapper: StrictMode })
      let replicaReturn: unknown
      let portReturn: unknown

      await replica.act(() => {
        replicaReturn = replica.result.current.remove()
      })
      await port.act(() => {
        portReturn = port.result.current.remove()
      })

      // Measured under `<StrictMode>` on React 19.2.8: the updater runs twice
      // with the *same* input queue, so `result = first` assigns the same value
      // both times and exactly one item is removed — the capture is pure, which
      // is what makes the pin's trick survive StrictMode.
      expect(updaterCalls).toEqual(['updater(first=1)', 'updater(first=1)'])
      expect(replicaReturn).toBe(1)
      expect(replica.result.current.state).toEqual([2, 3])
      // The port behaves identically, and its own returned value is unaffected.
      expect(portReturn).toBe(1)
      expect([port.result.current.first, port.result.current.last, port.result.current.size]).toEqual([2, 3, 2])
    })
  })

  it('renders on the server: useState only, nothing touches window or document', () => {
    const seenInRender = { window: true, document: true }
    const queueRef: { size?: number } = {}

    function SSRUseQueue() {
      const queue = useQueue([1, 2, 3])
      seenInRender.window = 'window' in globalThis
      seenInRender.document = 'document' in globalThis
      queueRef.size = queue.size
      return <div>{queue.first}</div>
    }

    // A browser-mode file cannot *delete* the globals to prove the negative
    // (`window` / `document` are non-configurable accessors), so this asserts the
    // first render completes and both globals are byte-for-byte untouched.
    expect(renderToString(<SSRUseQueue />)).toContain('1')
    expect(queueRef.size).toBe(3)
    expect(seenInRender.window).toBe(true)
    expect(seenInRender.document).toBe(true)
  })
})
