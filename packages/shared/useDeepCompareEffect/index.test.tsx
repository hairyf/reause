import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useDeepCompareEffect } from '../useDeepCompareEffect'

/**
 * `useDeepCompareEffect` is react-use's deep-comparing `useEffect`: the effect
 * re-runs only when `deps` differ by **deep** equality, so a deps array rebuilt
 * with equal contents on every render stays inert.
 *
 * The load-bearing assertions are the ones with object deps — a shallow
 * `Object.is` comparison (what `useEffect` already does) passes every
 * primitive-deps assertion in this file, which is exactly why the suite pins
 * the object cases. See the PR body for the mutation-check counts.
 */

/** Upstream's two dev-only messages, verbatim (`source/react-use/src/useDeepCompareEffect.ts`). */
const NO_DEPS_WARNING = '`useDeepCompareEffect` should not be used with no dependencies. Use React.useEffect instead.'
const PRIMITIVE_DEPS_WARNING = '`useDeepCompareEffect` should not be used with dependencies that are all primitive values. Use React.useEffect instead.'

interface Options {
  id: number
  tags: string[]
}

interface NestedOptions {
  nested: { deep: number }
  list: Array<{ id: number }>
}

function spyOnWarn() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

function messagesOf(spy: ReturnType<typeof spyOnWarn>): string[] {
  return spy.mock.calls.map(call => String(call[0]))
}

/**
 * The dev-only guards are gated on `typeof process !== 'undefined' &&
 * process.env.NODE_ENV !== 'production'` — the house guard this repo already
 * uses (`packages/core/createPortalSlot/index.tsx`). Vitest's browser bundle
 * defines no `process` object (it only inlines the `process.env.NODE_ENV`
 * expression), so the warning path has to be entered by giving the realm one —
 * the shape a Node/SSR consumer, or a browser bundle with a `process` shim,
 * actually has.
 */
function stubProcess(): void {
  vi.stubGlobal('process', { env: { NODE_ENV: 'test' } })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('does not re-run when the deps are a new object with structurally equal contents', async () => {
  const runs: string[] = []

  const { result, rerender, unmount } = await renderHook(
    (props: { options: Options } = { options: { id: 1, tags: ['a'] } }) => {
      useDeepCompareEffect(() => {
        runs.push(`run:${props.options.id}`)
      }, [props.options])
    },
  )

  // runs on mount, like `useEffect`
  expect(runs).toEqual(['run:1'])
  // the signature is `(effect, deps) => void`
  expect(result.current).toBeUndefined()

  // the hook's entire purpose: a rebuilt options object with identical contents
  // must not re-run the effect, however many times it is replaced
  await rerender({ options: { id: 1, tags: ['a'] } })
  expect(runs).toEqual(['run:1'])

  await rerender({ options: { id: 1, tags: ['a'] } })
  expect(runs).toEqual(['run:1'])

  await unmount()
})

it('re-runs when the deps differ, comparing nested objects and arrays deeply', async () => {
  const runs: string[] = []
  const make = (deep: number, lastId: number): NestedOptions => ({
    nested: { deep },
    list: [{ id: 1 }, { id: lastId }],
  })

  const { rerender, unmount } = await renderHook(
    (props: { options: NestedOptions } = { options: make(1, 2) }) => {
      useDeepCompareEffect(() => {
        runs.push(`${props.options.nested.deep}/${props.options.list[1].id}`)
      }, [props.options])
    },
  )

  expect(runs).toEqual(['1/2'])

  // new references at every level, identical contents — silent
  await rerender({ options: make(1, 2) })
  expect(runs).toEqual(['1/2'])

  // a change two levels down — re-runs (a shallow comparison would treat the
  // array element as changed too, so this alone is not the discriminating case)
  await rerender({ options: make(3, 2) })
  expect(runs).toEqual(['1/2', '3/2'])

  // a change inside an array element — re-runs
  await rerender({ options: make(3, 4) })
  expect(runs).toEqual(['1/2', '3/2', '3/4'])

  // back to structurally equal — silent again
  await rerender({ options: make(3, 4) })
  expect(runs).toEqual(['1/2', '3/2', '3/4'])

  await unmount()
})

it('runs the effect cleanup before the next invocation and again on unmount', async () => {
  const events: string[] = []

  const { rerender, unmount } = await renderHook(
    (props: { options: Options } = { options: { id: 1, tags: [] } }) => {
      useDeepCompareEffect(() => {
        events.push(`run:${props.options.id}`)
        return () => {
          events.push(`cleanup:${props.options.id}`)
        }
      }, [props.options])
    },
  )

  expect(events).toEqual(['run:1'])

  // a deep-equal rebuild registers no cleanup and re-runs nothing
  await rerender({ options: { id: 1, tags: [] } })
  expect(events).toEqual(['run:1'])

  // the previous cleanup runs before the next invocation
  await rerender({ options: { id: 2, tags: [] } })
  expect(events).toEqual(['run:1', 'cleanup:1', 'run:2'])

  // and the last cleanup runs on unmount
  await unmount()
  expect(events).toEqual(['run:1', 'cleanup:1', 'run:2', 'cleanup:2'])
})

it('runs the latest effect, so the body sees current values after a deep-equal re-render', async () => {
  const seen: number[] = []

  const { rerender, unmount } = await renderHook(
    (props: { value: number, options: Options } = { value: 0, options: { id: 1, tags: [] } }) => {
      useDeepCompareEffect(() => {
        // captures THIS render's `props` — a stale effect would report 0 below
        seen.push(props.value)
      }, [props.options])
    },
  )

  expect(seen).toEqual([0])

  // re-rendered with a fresh value but deep-equal deps: the effect must not
  // re-run, so the new value is deliberately not observed yet
  await rerender({ value: 1, options: { id: 1, tags: [] } })
  expect(seen).toEqual([0])

  // …and when the deps really change, the effect must run the newest render's
  // closure (value 2), not one captured at mount (value 0) — the staleness a
  // ref-held effect would introduce
  await rerender({ value: 2, options: { id: 2, tags: [] } })
  expect(seen).toEqual([0, 2])

  await unmount()
})

it('keeps the guards inert, and never throws, where the bundle defines no `process`', async () => {
  // Vitest's browser bundle inlines `process.env.NODE_ENV` (so this file's own
  // reference reads `test`, i.e. not production) but defines no `process`
  // object — the shape a bundled browser consumer gets. The `typeof` prefix is
  // what stops upstream's bare gate from throwing here; the price is that the
  // warnings cannot fire in this realm, which is why the warning tests below
  // stub a `process` global.
  expect(process.env.NODE_ENV).not.toBe('production')
  expect(typeof process).toBe('undefined')

  const warn = spyOnWarn()
  const { unmount } = await renderHook(() => {
    useDeepCompareEffect(() => {}, [])
  })

  expect(messagesOf(warn)).toEqual([])

  await unmount()
})

it('warns when the deps array is empty', async () => {
  stubProcess()
  const warn = spyOnWarn()

  const { unmount } = await renderHook(() => {
    useDeepCompareEffect(() => {}, [])
  })

  const messages = messagesOf(warn)
  expect(messages).toContain(NO_DEPS_WARNING)
  // upstream's second guard runs on the same empty array and `[].every()` is
  // vacuously true, so empty deps report BOTH warnings — mirrored as-is
  expect(messages).toContain(PRIMITIVE_DEPS_WARNING)

  await unmount()
})

it('warns when every dep is primitive, and still compares them by value', async () => {
  stubProcess()
  const warn = spyOnWarn()
  const runs: number[] = []

  const { rerender, unmount } = await renderHook(
    (props: { count: number } = { count: 0 }) => {
      useDeepCompareEffect(() => {
        runs.push(props.count)
      }, [props.count])
    },
  )

  const messages = messagesOf(warn)
  expect(messages).toContain(PRIMITIVE_DEPS_WARNING)
  expect(messages).not.toContain(NO_DEPS_WARNING)

  // the warning is advisory: the hook keeps working like `useEffect` for
  // primitives (an unchanged primitive does not re-run the effect)
  expect(runs).toEqual([0])

  await rerender({ count: 0 })
  expect(runs).toEqual([0])

  await rerender({ count: 1 })
  expect(runs).toEqual([0, 1])

  await unmount()
})

it('does not warn for object deps, where the deep comparison is the point', async () => {
  stubProcess()
  const warn = spyOnWarn()

  const { unmount } = await renderHook(() => {
    useDeepCompareEffect(() => {}, [{ id: 1 }])
  })

  expect(messagesOf(warn)).toEqual([])

  await unmount()
})

it('keeps a rebuilt-but-equal options object from re-running the effect (component)', async () => {
  const runs: number[] = []

  function OptionsDemo() {
    const [count, setCount] = useState(0)
    const [tick, setTick] = useState(0)
    // a new object on every render, exactly the pattern the hook exists for
    const options = { id: count, tags: ['a', 'b'] }

    useDeepCompareEffect(() => {
      runs.push(options.id)
    }, [options])

    return (
      <div>
        <span>{`tick:${tick}`}</span>
        <span>{`id:${count}`}</span>
        <button onClick={() => setTick(current => current + 1)}>bump</button>
        <button onClick={() => setCount(current => current + 1)}>increment</button>
      </div>
    )
  }

  const screen = await render(<OptionsDemo />)
  expect(runs).toEqual([0])

  // an unrelated state change rebuilds `options` with equal contents — silent
  await screen.getByRole('button', { name: 'bump' }).click()
  await expect.element(screen.getByText('tick:1')).toBeVisible()
  expect(runs).toEqual([0])

  // a real change still re-runs it
  await screen.getByRole('button', { name: 'increment' }).click()
  await expect.element(screen.getByText('id:1')).toBeVisible()
  expect(runs).toEqual([0, 1])
})
