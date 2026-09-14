import type { RefObject } from 'react'
import { StrictMode, useRef } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useCached } from '../useCached'

function arrayEquals<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length)
    return false

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i])
      return false
  }

  return true
}

describe('useCached', () => {
  it('should be defined', () => {
    expect(useCached).toBeDefined()
  })

  it('returns the plain cached value, not a tuple (issue-specified API)', async () => {
    const { result } = await renderHook(() => {
      const cached = useCached({ value: 42, extra: 0 })
      expectTypeOf(cached).toEqualTypeOf<{ value: number, extra: number }>()
      expectTypeOf(cached).not.toEqualTypeOf<[{ value: number, extra: number }, unknown]>()
      return cached
    })

    expect(result.current).toEqual({ value: 42, extra: 0 })
  })

  it('should work with default comparator', async () => {
    let source = true

    const { result, rerender } = await renderHook(() => useCached(source))

    expect(result.current).toBe(true)

    source = false
    await rerender()

    expect(result.current).toBe(false)
  })

  it('should work with custom comparator', async () => {
    let source: number[] = [1]
    const initialArrayValue = source

    const { result, rerender } = await renderHook(() => useCached(source, arrayEquals))

    // first render returns the initial source
    expect(result.current).toBe(initialArrayValue)

    // same reference — `true`, cache kept
    source = initialArrayValue
    await rerender()
    expect(result.current).toBe(initialArrayValue)

    // equal array with a new reference — `true`, cache kept
    source = [1]
    await rerender()
    expect(result.current).toBe(initialArrayValue)

    // different array — `false`, cache adopts the new source
    source = [2]
    await rerender()
    expect(result.current).not.toBe(initialArrayValue)
    expect(result.current).toEqual([2])
  })

  it('should pass new value first and keep cache when comparator returns true', async () => {
    let source = 0
    const comparator = vi.fn(() => true)

    const { result, rerender } = await renderHook(() => useCached(source, comparator))

    // the comparator is not called on the initial render (upstream: seeded
    // from the source, the watch does not fire immediately) ...
    expect(comparator).not.toHaveBeenCalled()

    // ... nor on a re-render where the resolved source value is unchanged
    // (upstream: `watch` only fires when the source value changes)
    await rerender()
    expect(comparator).not.toHaveBeenCalled()

    source = 1
    await rerender()

    expect(comparator).toHaveBeenCalledWith(1, 0)
    expect(comparator).toHaveBeenCalledTimes(1)
    expect(result.current).toBe(0)
  })

  it('does not call the comparator on the StrictMode double mount render', async () => {
    const comparator = vi.fn((newValue: number, cachedValue: number) => newValue === cachedValue)
    let renders = 0

    const { result } = await renderHook(() => {
      renders++
      return useCached(0, comparator)
    }, {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    })

    // StrictMode double-invokes the mount render ...
    expect(renders).toBeGreaterThanOrEqual(2)
    // ... yet the comparator still only sees the mount seed, not a change
    expect(comparator).not.toHaveBeenCalled()
    expect(result.current).toBe(0)
  })

  it('should pass latest cached value on subsequent comparator calls', async () => {
    let source = 0
    const comparator = vi.fn((newValue: number, cachedValue: number) => newValue === cachedValue)

    const { result, rerender } = await renderHook(() => useCached(source, comparator))

    source = 1
    await rerender()
    source = 2
    await rerender()

    expect(comparator).toHaveBeenNthCalledWith(1, 1, 0)
    expect(comparator).toHaveBeenNthCalledWith(2, 2, 1)
    expect(result.current).toBe(2)
  })

  it('keeps the cached value when only insignificant parts change (issue example)', async () => {
    interface Data {
      value: number
      extra: number
    }

    let source: Data = { value: 42, extra: 0 }
    const comparator = (newSourceValue: Data, cachedValue: Data) => newSourceValue.value === cachedValue.value

    const { result, rerender } = await renderHook(() => useCached(source, comparator))

    expect(result.current).toEqual({ value: 42, extra: 0 })

    // same `value`, different `extra` — not significant, cache is kept
    source = { value: 42, extra: 1 }
    await rerender()
    expect(result.current).toEqual({ value: 42, extra: 0 })

    // `value` changed — significant, cache adopts the new source
    source = { value: 43, extra: 1 }
    await rerender()
    expect(result.current).toEqual({ value: 43, extra: 1 })
  })

  it('caches a ref-like `{ current }` object as a plain value (refs are not unwrapped)', async () => {
    interface Data {
      value: number
      extra: number
    }

    let source: { current: Data } = { current: { value: 42, extra: 0 } }

    const { result, rerender } = await renderHook(() => useCached(source))

    // the object itself is the cached value — `.current` is never unwrapped
    expect(result.current).toBe(source)
    expect(result.current.current).toEqual({ value: 42, extra: 0 })

    // a new identity is adopted like any other plain value
    source = { current: { value: 43, extra: 1 } }
    await rerender()
    expect(result.current).toBe(source)
  })

  it('caches a `useRef` object as a plain value, never unwrapping `current`', async () => {
    interface Data {
      value: number
      extra: number
    }

    const { result, rerender } = await renderHook(() => {
      const sourceRef = useRef<Data>({ value: 42, extra: 0 })
      return useCached(sourceRef)
    })

    // the ref object is the source, not its `current`
    expect(result.current.current).toEqual({ value: 42, extra: 0 })
    expectTypeOf(result.current).toEqualTypeOf<RefObject<Data>>()

    await rerender()
    expect(result.current.current).toEqual({ value: 42, extra: 0 })
  })
})

// upstream also tests `options.deepRefs` (shallow vs deep ref) and forwards
// `WatchOptions` to `watch` — neither has a React equivalent: the hook always
// stores and returns the plain value as-is and derives the cache from the
// resolved source value, so those cases are intentionally not ported (see
// `index.md` → "Upstream options not ported").
