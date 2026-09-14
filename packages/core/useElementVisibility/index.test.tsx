import type { RefObject } from 'react'
import type { UseElementVisibilityOptions } from '../useElementVisibility'
import type { UseIntersectionObserverOptions } from '../useIntersectionObserver'
import type { ElementTarget } from '../useResizeObserver'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useElementVisibility } from '../useElementVisibility'
import { useIntersectionObserver } from '../useIntersectionObserver'

/**
 * The hook binds DOM targets to React refs only — a plain element, a getter or
 * a callback ref is not accepted, so every test wraps its element in a
 * `{ current }` holder.
 */
function refOf<T>(value: T | null): RefObject<T | null> {
  return { current: value }
}

// Mirror upstream's index.browser.test.ts: the underlying observer is mocked
// so the callback wiring and option passthrough can be asserted
// deterministically. `isSupported` mirrors the real hook's semantics — a
// resolved `window` without `IntersectionObserver` (or an explicit `null`,
// which disables observation) reports unsupported, an omitted option reports
// supported — so the scroll/resize fallback path (a window without
// `IntersectionObserver`) can be exercised through the same mock.
vi.mock('../useIntersectionObserver', () => ({
  useIntersectionObserver: vi.fn(
    (_target: unknown, _callback?: IntersectionObserverCallback, options?: UseIntersectionObserverOptions) => ({
      isSupported: options?.window === undefined
        ? true
        : Boolean(options.window && 'IntersectionObserver' in options.window),
      stop: vi.fn(),
    }),
  ),
}))

describe('useElementVisibility', () => {
  let el: HTMLDivElement

  beforeEach(() => {
    el = document.createElement('div')
    window.scrollTo(0, 0)
    vi.mocked(useIntersectionObserver).mockClear()
  })

  it('returns a plain boolean', () => {
    expectTypeOf(useElementVisibility).returns.toBeBoolean()
  })

  it('accepts only a React ref object as the DOM target', () => {
    expectTypeOf<Parameters<typeof useElementVisibility>[0]>()
      .toEqualTypeOf<ElementTarget>()
    // a plain element is deliberately rejected — refs are the only DOM target
    expectTypeOf<HTMLDivElement>()
      .not
      .toMatchTypeOf<Parameters<typeof useElementVisibility>[0]>()
    // `rootMargin` is a plain CSS margin string, not a ref/value union
    expectTypeOf<UseElementVisibilityOptions['rootMargin']>()
      .toEqualTypeOf<string | undefined>()
  })

  it('should work when el is not an element', async () => {
    const { result } = await renderHook(() => useElementVisibility(refOf<HTMLElement>(null)))
    expect(result.current).toBe(false)
  })

  it('should work when window is null', async () => {
    const { result } = await renderHook(() => useElementVisibility(refOf(el), { window: null as unknown as undefined }))
    expect(result.current).toBe(false)
  })

  it('should forward a null window to useIntersectionObserver (observation disabled)', async () => {
    await renderHook(() => useElementVisibility(refOf(el), { window: null as unknown as undefined }))

    // the null window must reach the observer hook as-is — it must NOT be
    // collapsed to the global window (which would re-enable observation)
    expect(vi.mocked(useIntersectionObserver).mock.lastCall?.[2]?.window).toBeNull()
  })

  it('should work when threshold is null', async () => {
    const { result } = await renderHook(() => useElementVisibility(refOf(el), { threshold: null as unknown as undefined }))
    expect(result.current).toBe(false)
  })

  it('should allow set initial value', async () => {
    const { result } = await renderHook(() => useElementVisibility(refOf(el), { initialValue: true }))
    expect(result.current).toBe(true)
  })

  describe('when internally using useIntersectionObserver', () => {
    it('should call useIntersectionObserver internally', async () => {
      await renderHook(() => useElementVisibility(refOf(el)))
      expect(vi.mocked(useIntersectionObserver)).toHaveBeenCalledTimes(1)
    })

    it('passes the given ref target through to useIntersectionObserver', async () => {
      const target = refOf(el)
      await renderHook(() => useElementVisibility(target))
      // the ref object itself is forwarded — the observer hook resolves it
      expect(vi.mocked(useIntersectionObserver).mock.lastCall?.[0]).toBe(target)
    })

    it('passes a callback to useIntersectionObserver that sets visibility based on isIntersecting', async () => {
      const { result, act } = await renderHook(() => useElementVisibility(refOf(el)))
      const callback = vi.mocked(useIntersectionObserver).mock.lastCall?.[1]

      expect(result.current).toBe(false)

      await act(() => {
        callback?.([{ isIntersecting: false, time: 1 } as IntersectionObserverEntry], {} as IntersectionObserver)
      })
      expect(result.current).toBe(false)

      await act(() => {
        callback?.([{ isIntersecting: true, time: 1 } as IntersectionObserverEntry], {} as IntersectionObserver)
      })
      expect(result.current).toBe(true)

      await act(() => {
        callback?.([{ isIntersecting: false, time: 1 } as IntersectionObserverEntry], {} as IntersectionObserver)
      })
      expect(result.current).toBe(false)
    })

    it('uses the latest version of isIntersecting when multiple intersection entries are given', async () => {
      const { result, act } = await renderHook(() => useElementVisibility(refOf(el)))
      const callback = vi.mocked(useIntersectionObserver).mock.lastCall?.[1]

      await act(() => {
        callback?.(
          [
            { isIntersecting: false, time: 1 },
            { isIntersecting: false, time: 2 },
            { isIntersecting: true, time: 3 },
          ] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        )
      })
      await expect.poll(() => result.current).toBe(true)

      await act(() => {
        callback?.(
          [
            { isIntersecting: true, time: 1 },
            { isIntersecting: false, time: 3 },
            { isIntersecting: true, time: 2 },
          ] as IntersectionObserverEntry[],
          {} as IntersectionObserver,
        )
      })
      await expect.poll(() => result.current).toBe(false)
    })

    it('passes the given window to useIntersectionObserver', async () => {
      const mockWindow = {} as Window

      await renderHook(() => useElementVisibility(refOf(el), { window: mockWindow }))
      expect(vi.mocked(useIntersectionObserver).mock.lastCall?.[2]?.window).toBe(mockWindow)
    })

    it('uses the given scrollTarget ref as the root in useIntersectionObserver', async () => {
      const mockScrollTarget = document.createElement('div')
      const scrollTarget = refOf(mockScrollTarget)

      await renderHook(() => useElementVisibility(refOf(el), { scrollTarget }))
      // the ref is forwarded as-is — the observer hook resolves it
      expect(vi.mocked(useIntersectionObserver).mock.lastCall?.[2]?.root).toBe(scrollTarget)
    })

    it('returns a plain boolean, not the upstream controls object', async () => {
      const { result } = await renderHook(() => useElementVisibility(refOf(el)))
      expect(result.current).toBeTypeOf('boolean')
      expect(result.current).not.toHaveProperty('isVisible')
      expect(result.current).not.toHaveProperty('stop')
    })

    it('stops the observer after the first visibility change when once is true', async () => {
      const { result, act } = await renderHook(() => useElementVisibility(refOf(el), { once: true }))
      const callback = vi.mocked(useIntersectionObserver).mock.lastCall?.[1]
      const stopMock = (vi.mocked(useIntersectionObserver).mock.results.at(-1)?.value as { stop: () => void } | undefined)?.stop

      await act(() => {
        callback?.([{ isIntersecting: true, time: 1 } as IntersectionObserverEntry], {} as IntersectionObserver)
      })
      expect(result.current).toBe(true)
      expect(stopMock).toHaveBeenCalled()
    })
  })

  describe('falls back to scroll/resize tracking without IntersectionObserver', () => {
    it('disables all observation when window is null (real useIntersectionObserver)', async () => {
      // swap in the REAL useIntersectionObserver for this case: `window: null`
      // must disable observation there too (supported = false → no observer),
      // so a fully visible element keeps `initialValue` instead of flipping
      const originalImplementation = vi.mocked(useIntersectionObserver).getMockImplementation()
      const actual = await vi.importActual<typeof import('../useIntersectionObserver')>('../useIntersectionObserver')
      vi.mocked(useIntersectionObserver).mockImplementation(actual.useIntersectionObserver)

      try {
        const target = document.createElement('div')
        target.style.width = '100px'
        target.style.height = '100px'
        document.body.append(target)

        const { result, unmount } = await renderHook(() =>
          useElementVisibility({ current: target }, { window: null as unknown as undefined }),
        )

        // give the observer (had it been created) time to deliver — nothing is
        // active, so the value must stay at the untouched initialValue
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
        await new Promise<void>(resolve => setTimeout(resolve, 50))
        expect(result.current).toBe(false)

        await unmount()
        target.remove()
      }
      finally {
        vi.mocked(useIntersectionObserver).mockImplementation(originalImplementation!)
      }
    })

    it('tracks visibility with bounding-box math on a window without IntersectionObserver', async () => {
      const listeners: Record<string, (() => void) | undefined> = {}
      const fakeWindow = {
        innerWidth: 800,
        innerHeight: 600,
        addEventListener: (type: string, listener: () => void) => {
          listeners[type] = listener
        },
        removeEventListener: (type: string) => {
          delete listeners[type]
        },
      } as unknown as Window

      const target = document.createElement('div')
      document.body.append(target)
      target.style.position = 'fixed'
      target.style.width = '100px'
      target.style.height = '100px'
      target.getBoundingClientRect = () => ({ top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

      const { result, act, unmount } = await renderHook(() =>
        useElementVisibility({ current: target }, { window: fakeWindow }),
      )

      // the fallback defers its immediate check — the first scroll/resize
      // observation computes the initial visibility
      await act(() => {
        listeners.scroll?.()
      })

      // inside the (fake) viewport right away
      await expect.poll(() => result.current).toBe(true)

      // simulate scrolling the target out of the viewport
      target.getBoundingClientRect = () => ({ top: 1000, left: 0, right: 100, bottom: 1100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
      await act(() => {
        listeners.scroll?.()
      })
      await expect.poll(() => result.current).toBe(false)

      // scrolling it back in flips it again
      target.getBoundingClientRect = () => ({ top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
      await act(() => {
        listeners.scroll?.()
      })
      await expect.poll(() => result.current).toBe(true)

      await unmount()
      expect(listeners.scroll).toBeUndefined()
      expect(listeners.resize).toBeUndefined()
      target.remove()
    })
  })
})
