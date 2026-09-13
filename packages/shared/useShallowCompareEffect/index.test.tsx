import type { DependencyList } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { shallowEqual, useShallowCompareEffect } from '../useShallowCompareEffect'

it('does not re-run for a rebuilt deps object that is shallow-equal', async () => {
  let runs = 0

  const { rerender, unmount } = await renderHook((props: { step: number, label: string } = { step: 2, label: 'a' }) => {
    // a brand-new `{ step }` object every render — reference identity always differs
    useShallowCompareEffect(() => {
      runs += 1
    }, [{ step: props.step }])
  })

  // useEffect semantics: the effect runs on mount
  expect(runs).toBe(1)

  await rerender({ step: 2, label: 'b' })
  expect(runs).toBe(1)

  await rerender({ step: 2, label: 'c' })
  expect(runs).toBe(1)

  await unmount()
})

it('re-runs when a top-level field of a rebuilt deps object changes', async () => {
  let runs = 0

  const { rerender, unmount } = await renderHook((props: { step: number } = { step: 2 }) => {
    useShallowCompareEffect(() => {
      runs += 1
    }, [{ step: props.step }])
  })

  expect(runs).toBe(1)

  await rerender({ step: 3 })
  expect(runs).toBe(2)

  // and a re-render that keeps the shallow value silent again
  await rerender({ step: 3 })
  expect(runs).toBe(2)

  await rerender({ step: 4 })
  expect(runs).toBe(3)

  await unmount()
})

it('does not re-run for a changed nested field behind an unchanged parent reference — the shallow pin', async () => {
  let runs = 0
  const nested = { value: 0 }

  const { rerender, unmount } = await renderHook((props: { options: { nested: { value: number } } } = { options: { nested } }) => {
    useShallowCompareEffect(() => {
      runs += 1
    }, [props.options])
  })

  expect(runs).toBe(1)

  // the nested field changes in place; the parent object is rebuilt with the
  // same `nested` reference, so the one-level comparison sees no change. A deep
  // comparison would re-run here — this is pinned deliberately, not a bug.
  nested.value = 1
  await rerender({ options: { nested } })
  expect(runs).toBe(1)

  await rerender({ options: { nested } })
  expect(runs).toBe(1)

  // replacing the nested object is a change at the one level that is compared
  await rerender({ options: { nested: { value: 1 } } })
  expect(runs).toBe(2)

  await unmount()
})

it('ignores a change to an inherited property, where the pinned comparator would see it', async () => {
  let runs = 0
  const prototype = { step: 1 }
  // a fresh object every render: the only own key is `id`, `step` is inherited
  const makeOptions = () => Object.assign(Object.create(prototype), { id: 1 }) as Record<string, unknown>

  const { rerender, unmount } = await renderHook((props: { options: Record<string, unknown> } = { options: makeOptions() }) => {
    useShallowCompareEffect(() => {
      runs += 1
    }, [props.options])
  })

  expect(runs).toBe(1)

  await rerender({ options: makeOptions() })
  expect(runs).toBe(1)

  // the inherited `step` changes, the own key does not — own keys are what is compared
  prototype.step = 2
  await rerender({ options: makeOptions() })
  expect(runs).toBe(1)

  // the own key changes, so the effect re-runs
  await rerender({ options: Object.assign(Object.create(prototype), { id: 2 }) })
  expect(runs).toBe(2)

  await unmount()
})

it('compares array deps per index, with each element by reference', async () => {
  let runs = 0
  const element = { id: 1 }

  const { rerender, unmount } = await renderHook((props: { list: unknown[] } = { list: [element] }) => {
    useShallowCompareEffect(() => {
      runs += 1
    }, [props.list])
  })

  expect(runs).toBe(1)

  // a new array holding the same element reference is shallow-equal
  await rerender({ list: [element] })
  expect(runs).toBe(1)

  // a new array holding a new (but structurally equal) element is a change:
  // elements of an array are compared by reference, one level only
  await rerender({ list: [{ id: 1 }] })
  expect(runs).toBe(2)

  await rerender({ list: [{ id: 1 }] })
  expect(runs).toBe(3)

  // different length
  await rerender({ list: [1, 2] })
  expect(runs).toBe(4)

  // primitive elements compare by value, so an equal new array is silent
  await rerender({ list: [1, 2] })
  expect(runs).toBe(4)

  await rerender({ list: [1, 3] })
  expect(runs).toBe(5)

  await unmount()
})

it('compares primitive deps with Object.is: NaN equals NaN, +0 differs from -0', async () => {
  // primitive deps intentionally warn — keep the run output clean
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  let runs = 0

  try {
    const { rerender, unmount } = await renderHook((props: { value: number } = { value: Number.NaN }) => {
      useShallowCompareEffect(() => {
        runs += 1
      }, [props.value])
    })

    expect(runs).toBe(1)

    // Object.is(NaN, NaN) is true — the pinned upstream comparator (`===`) would re-run
    await rerender({ value: Number.NaN })
    expect(runs).toBe(1)

    await rerender({ value: 0 })
    expect(runs).toBe(2)

    // Object.is(+0, -0) is false — the pinned upstream comparator (`===`) would not re-run
    await rerender({ value: -0 })
    expect(runs).toBe(3)

    await unmount()
  }
  finally {
    warn.mockRestore()
  }
})

it('warns in dev for an empty deps list and for all-primitive deps, once a `process` global exists', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const globalWithProcess = globalThis as { process?: { env: Record<string, string> } }
  const previousProcess = globalWithProcess.process

  try {
    // The house gate is `typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'`
    // (mirroring `packages/core/createPortalSlot/index.tsx`), and the vitest
    // browser environment has no `process` global at all — `typeof process` is
    // `'undefined'` here — so the gate is closed and upstream's dev warnings
    // stay silent in any browser bundle that never defines one. Pin that
    // closed-gate half first.
    const gated = await renderHook(() => {
      const deps: DependencyList = []
      useShallowCompareEffect(() => {}, deps)
    })
    expect(warn).not.toHaveBeenCalled()
    await gated.unmount()

    // … then install the minimal `process` global the gate expects, so the
    // upstream guard conditions themselves are exercised
    globalWithProcess.process = { env: { NODE_ENV: 'test' } }

    // deps with an object entry: no warning
    const objects = await renderHook(() => {
      useShallowCompareEffect(() => {}, [{ id: 1 }])
    })
    expect(warn).not.toHaveBeenCalled()
    await objects.unmount()

    // an empty list warns twice: upstream's no-deps guard and its
    // all-primitives guard (`[].every(isPrimitive)` is `true`)
    const empty = await renderHook(() => {
      const deps: DependencyList = []
      useShallowCompareEffect(() => {}, deps)
    })
    expect(warn.mock.calls.map(call => call[0])).toEqual([
      '`useShallowCompareEffect` should not be used with no dependencies. Use React.useEffect instead.',
      '`useShallowCompareEffect` should not be used with dependencies that are all primitive values. Use React.useEffect instead.',
    ])
    await empty.unmount()

    warn.mockClear()

    const primitives = await renderHook(() => {
      const deps: DependencyList = [1, 'two', true]
      useShallowCompareEffect(() => {}, deps)
    })
    expect(warn.mock.calls.map(call => call[0])).toEqual([
      '`useShallowCompareEffect` should not be used with dependencies that are all primitive values. Use React.useEffect instead.',
    ])
    await primitives.unmount()
  }
  finally {
    if (previousProcess === undefined)
      delete globalWithProcess.process
    else
      globalWithProcess.process = previousProcess
    warn.mockRestore()
  }
})

it('runs the cleanup before the next invocation and again on unmount', async () => {
  const events: string[] = []

  const { rerender, unmount } = await renderHook((props: { value: number } = { value: 0 }) => {
    useShallowCompareEffect(() => {
      events.push(`run:${props.value}`)
      return () => {
        events.push(`cleanup:${props.value}`)
      }
    }, [{ value: props.value }])
  })

  expect(events).toEqual(['run:0'])

  // shallow-equal deps: neither the effect nor its cleanup runs
  await rerender({ value: 0 })
  expect(events).toEqual(['run:0'])

  await rerender({ value: 1 })
  expect(events).toEqual(['run:0', 'cleanup:0', 'run:1'])

  await unmount()
  expect(events).toEqual(['run:0', 'cleanup:0', 'run:1', 'cleanup:1'])
})

describe('shallowEqual', () => {
  it('compares primitives with Object.is', () => {
    expect(shallowEqual(1, 1)).toBe(true)
    expect(shallowEqual('a', 'a')).toBe(true)
    expect(shallowEqual(true, true)).toBe(true)
    expect(shallowEqual(null, null)).toBe(true)
    expect(shallowEqual(undefined, undefined)).toBe(true)
    expect(shallowEqual(1, 2)).toBe(false)
    expect(shallowEqual('1', 1)).toBe(false)
    expect(shallowEqual(null, undefined)).toBe(false)
    // Object.is, not `===` — the documented divergence from upstream's
    // `fast-shallow-equal`, whose primitive test is `===`
    expect(shallowEqual(Number.NaN, Number.NaN)).toBe(true)
    expect(shallowEqual(0, -0)).toBe(false)
  })

  it('compares objects by own enumerable keys and reference values', () => {
    const shared = { id: 1 }
    expect(shallowEqual({ id: 1 }, { id: 1 })).toBe(true)
    expect(shallowEqual({ id: 1 }, { id: 2 })).toBe(false)
    expect(shallowEqual({ id: 1 }, { id: 1, extra: 2 })).toBe(false)
    expect(shallowEqual({ id: shared }, { id: shared })).toBe(true)
    // a distinct but structurally equal nested object is NOT equal
    expect(shallowEqual({ id: { value: 1 } }, { id: { value: 1 } })).toBe(false)
  })

  it('ignores inherited keys, where the pinned comparator would count them', () => {
    const prototype = { step: 1 }
    const a = Object.create(prototype) as Record<string, unknown>
    const b = Object.create(prototype) as Record<string, unknown>

    // no own keys on either side, so shallow-equal …
    expect(shallowEqual(a, b)).toBe(true)
    // … and a change to the inherited property stays invisible
    prototype.step = 2
    expect(shallowEqual(a, b)).toBe(true)

    // own keys only: upstream's `keys[i] in b` accepts the inherited `step`, an
    // own-key comparison does not — a documented divergence, pinned here
    const inherited = Object.create(prototype) as Record<string, unknown>
    expect(shallowEqual({ step: 2 }, inherited)).toBe(false)
    expect(shallowEqual(inherited, { step: 2 })).toBe(false)
  })

  it('compares arrays per index, elements by reference', () => {
    expect(shallowEqual([1, 2], [1, 2])).toBe(true)
    expect(shallowEqual([1, 2], [2, 1])).toBe(false)
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(shallowEqual([], [])).toBe(true)
    const element = { id: 1 }
    expect(shallowEqual([element], [element])).toBe(true)
    // nested objects inside an array are compared by reference, never deeply
    expect(shallowEqual([{ id: 1 }], [{ id: 1 }])).toBe(false)
    // an array never equals a plain object, even with the same numeric keys
    expect(shallowEqual([1], { 0: 1 })).toBe(false)
  })

  it('compares functions by reference', () => {
    const fn = () => {}
    expect(shallowEqual(fn, fn)).toBe(true)
    expect(shallowEqual(fn, () => {})).toBe(false)
    // a function is not an object for this comparator: no key comparison
    expect(shallowEqual(fn, {})).toBe(false)
  })

  it('returns false for values of different kinds', () => {
    expect(shallowEqual({}, null)).toBe(false)
    expect(shallowEqual(null, {})).toBe(false)
    expect(shallowEqual(1, {})).toBe(false)
    expect(shallowEqual([], null)).toBe(false)
    expect(shallowEqual({}, [])).toBe(false)
    expect(shallowEqual({}, () => {})).toBe(false)
  })

  it('treats objects with no own enumerable keys as equal, as upstream does', () => {
    // `Date`, `RegExp`, `Map` and `Set` carry no own enumerable keys, and
    // `fast-shallow-equal` is likewise key-count based — documented artifact,
    // not an accident
    expect(shallowEqual(new Date(0), new Date(1))).toBe(true)
    expect(shallowEqual(new Map([[1, 2]]), new Map())).toBe(true)
    expect(shallowEqual(/a/, /b/)).toBe(true)
  })
})
