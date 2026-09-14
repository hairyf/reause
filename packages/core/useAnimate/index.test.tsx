import type { UseAnimateReturn } from '../useAnimate'
import { useRef } from 'react'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useAnimate } from '../useAnimate'

// Mirrors upstream `source/vueuse/packages/core/useAnimate/index.test.ts` and
// `.../index.browser.test.ts`. Vue `shallowRef` + template refs become React
// state and ref-like `{ current }` objects exercised with `renderHook`
// re-renders. The node-environment test ("the test environment does not
// support animate") is adapted to this browser-based suite by stubbing the
// global `HTMLElement` with one that lacks `Element.animate` (upstream probes
// the global prototype).

const appendedNodes: HTMLElement[] = []

function appendParagraph(): HTMLParagraphElement {
  const el = document.createElement('p')
  el.textContent = 'test'
  document.body.appendChild(el)
  appendedNodes.push(el)
  return el
}

afterEach(() => {
  vi.unstubAllGlobals()
  appendedNodes.splice(0).forEach((node) => {
    node.remove()
  })
})

describe('useAnimate', () => {
  it('should be defined', () => {
    expect(useAnimate).toBeDefined()
  })

  it('the test environment does not support animate', async () => {
    // Stub the global HTMLElement so the `'animate' in HTMLElement.prototype`
    // probe fails even though the browser supports the Web Animations API.
    vi.stubGlobal('HTMLElement', class {} as unknown as typeof HTMLElement)

    const el = appendParagraph()
    const { result } = await renderHook(() =>
      useAnimate({ current: el }, { transform: 'rotate(360deg)' }, 100),
    )

    expect(result.current.isSupported).toBe(false)
    expect(result.current.animate).toBeUndefined()
  })

  it('browser should support useAnimate', async () => {
    const el = appendParagraph()
    const { result } = await renderHook(() =>
      useAnimate({ current: el }, { transform: 'rotate(360deg)' }, 100),
    )

    expect(result.current.isSupported).toBe(true)
  })

  it('browser should support useAnimate with a React ref target', async () => {
    function AnimatedComponent() {
      const el = useRef<HTMLParagraphElement>(null)
      const { isSupported, animate, playState } = useAnimate(
        el,
        { transform: 'rotate(360deg)' },
        100,
      )
      return (
        <>
          <p ref={el} data-testid="target">test</p>
          <pre data-testid="state">
            {JSON.stringify({ isSupported, playState, hasAnimate: Boolean(animate) })}
          </pre>
        </>
      )
    }

    const screen = await render(<AnimatedComponent />)
    const pre = screen.getByTestId('state')
    await expect.element(pre).toBeVisible()

    await vi.waitFor(() => {
      const state = JSON.parse(pre.query()!.textContent!)
      expect(state.isSupported).toBe(true)
    })
  })

  it('should be running', async () => {
    const el = appendParagraph()
    const { result } = await renderHook(() =>
      // long enough that the store's frame loop observes the running state —
      // with a 100ms effect WebKit can deliver the first frame after the
      // animation already finished, so the loop only ever sees `finished`
      useAnimate({ current: el }, { transform: 'rotate(360deg)' }, 10000),
    )

    await vi.waitFor(() => {
      expect(result.current.playState).toBe('running')
    })
  })

  it('should support keyframes updates', async () => {
    const el = appendParagraph()
    let keyframes: PropertyIndexedKeyframes = { transform: 'rotate(360deg)' }

    const { result, rerender } = await renderHook(
      (_props?: { force: number }) => useAnimate({ current: el }, keyframes, 100),
      { initialProps: { force: 0 } },
    )

    await vi.waitFor(() => {
      expect(result.current.playState).toBe('finished')
    })

    keyframes = { transform: 'rotate(180deg)' }
    await rerender({ force: 1 })

    const animation = result.current.animate!
    expect(animation).toBeDefined()
    await vi.waitFor(() => {
      const keyframe = animation.effect as KeyframeEffect
      expect(keyframe.getKeyframes()).to.deep.equal([{
        composite: 'auto',
        computedOffset: 1,
        easing: 'linear',
        offset: null,
        transform: 'rotate(180deg)',
      }])
    })
  })

  it('should not recreate the effect when the resolved keyframes are deep-equal (reordered keys)', async () => {
    const el = appendParagraph()
    let keyframes: PropertyIndexedKeyframes = { transform: 'rotate(360deg)', opacity: 1 }

    const { result, rerender, act } = await renderHook(
      (_props?: { force: number }) => useAnimate({ current: el }, keyframes, 100),
      { initialProps: { force: 0 } },
    )

    await vi.waitFor(() => {
      expect(result.current.playState).toBe('finished')
    })

    const effect = result.current.animate!.effect

    // Same values, different key order — upstream's deep watcher stays silent
    // (a `JSON.stringify` key used to recreate the effect here).
    keyframes = { opacity: 1, transform: 'rotate(360deg)' }
    await rerender({ force: 1 })
    await act(() => {})

    expect(result.current.animate!.effect).toBe(effect)
  })

  it('should recreate the effect when the resolved keyframes change', async () => {
    const el = appendParagraph()
    let keyframes: PropertyIndexedKeyframes = { transform: 'rotate(360deg)' }

    const { result, rerender } = await renderHook(
      (_props?: { force: number }) => useAnimate({ current: el }, keyframes, { duration: 100, immediate: false }),
      { initialProps: { force: 0 } },
    )

    const effect = result.current.animate!.effect
    expect((effect as KeyframeEffect).getKeyframes()[0]!.transform).toBe('rotate(360deg)')

    keyframes = { transform: 'rotate(180deg)' }
    await rerender({ force: 1 })
    // await the swapped effect instead of flushing with an empty `act`
    await vi.waitFor(() => {
      expect(result.current.animate!.effect).not.toBe(effect)
    })

    expect((result.current.animate!.effect as KeyframeEffect).getKeyframes()[0]!.transform).toBe('rotate(180deg)')
  })

  it('should gate the support probe on the resolved window option', async () => {
    // Upstream `useSupported(() => window && HTMLElement && 'animate' in
    // HTMLElement.prototype)`: a falsy resolved window means unsupported even
    // though the global scope supports the Web Animations API (the probe used
    // to read the global scope only).
    const el = appendParagraph()
    const { result } = await renderHook(() =>
      useAnimate({ current: el }, { transform: 'rotate(360deg)' }, { duration: 100, window: 0 as unknown as Window }),
    )

    expect(result.current.isSupported).toBe(false)
    expect(result.current.animate).toBeUndefined()
  })

  it('should not support animate with a custom window when the environment lacks animate', async () => {
    vi.stubGlobal('HTMLElement', class {} as unknown as typeof HTMLElement)

    const fakeWindow = { requestAnimationFrame: vi.fn() } as unknown as Window
    const el = appendParagraph()
    const { result } = await renderHook(() =>
      useAnimate({ current: el }, { transform: 'rotate(360deg)' }, { duration: 100, window: fakeWindow }),
    )

    expect(result.current.isSupported).toBe(false)
    expect(result.current.animate).toBeUndefined()
  })

  it('should not automatically start the animation when shown if `immediate` is false', async () => {
    const target = { current: null as HTMLElement | null }
    const { result, rerender } = await renderHook(
      (_props?: { force: number }) => useAnimate(
        target,
        { transform: 'rotate(360deg)' },
        { duration: 100, immediate: false },
      ),
      { initialProps: { force: 0 } },
    )

    // It is initially hidden
    expect(result.current.animate).toBeUndefined()

    // Toggle element into view
    target.current = appendParagraph()
    await rerender({ force: 1 })

    // It should not have started automatically
    await vi.waitFor(() => {
      expect(result.current.animate?.playState).toBe('paused')
    })
  })

  it('should play, pause, reverse, finish and cancel through the controls', async () => {
    const el = appendParagraph()
    const { result } = await renderHook(() => useAnimate(
      { current: el },
      { transform: 'rotate(360deg)' },
      // The duration must outlast the whole test: WebKit anchors a paused-then-
      // played animation's start time to when it was *created*, so `play()`
      // counts the wall-clock time spent mounting (browser round-trips here are
      // slow) as elapsed animation time and a short effect is already finished.
      { duration: 60000, immediate: false },
    ))

    // immediate: false — created paused, not started
    expect(result.current.animate?.playState).toBe('paused')

    // The controls run outside `act`: while the animation plays the store
    // republishes every frame and an awaited act() never drains its queue under
    // that continuous update source (WebKit starves it), so every transition is
    // awaited through the state the hook publishes instead.
    result.current.play()
    await vi.waitFor(() => {
      expect(result.current.playState).toBe('running')
    })

    result.current.pause()
    await vi.waitFor(() => {
      expect(result.current.playState).toBe('paused')
    })

    // `reverse()` runs back towards 0, so it only stays 'running' for as long
    // as the paused current time (a frame or two here, which the store mirror
    // can miss entirely) — seek into the middle of the 60s effect first.
    result.current.animate!.currentTime = 30000
    result.current.reverse()
    await vi.waitFor(() => {
      expect(result.current.playState).toBe('running')
    })

    result.current.finish()
    await vi.waitFor(() => {
      expect(result.current.playState).toBe('finished')
    })

    // The store loop stops after `finish`, so the 'idle' state is asserted on
    // the live `Animation` object (upstream mirrors this too).
    result.current.cancel()
    expect(result.current.animate?.playState).toBe('idle')
  })

  it('types: returns the upstream UseAnimateReturn object mirror', async () => {
    const { result } = await renderHook(() =>
      useAnimate({ current: null }, { transform: 'rotate(360deg)' }, 100),
    )
    expectTypeOf(result.current).toEqualTypeOf<UseAnimateReturn>()
    expectTypeOf(result.current.isSupported).toEqualTypeOf<boolean>()
    expectTypeOf(result.current.animate).toEqualTypeOf<Animation | undefined>()
    expectTypeOf(result.current.play).toEqualTypeOf<() => void>()
    expectTypeOf(result.current.pending).toEqualTypeOf<boolean>()
    expectTypeOf(result.current.playState).toEqualTypeOf<AnimationPlayState>()
    expectTypeOf(result.current.replaceState).toEqualTypeOf<AnimationReplaceState>()
  })
})
