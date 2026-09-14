import type { RefObject } from 'react'
import type { ElementTarget } from '../useResizeObserver'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useElementSize } from '../useElementSize'

/**
 * The hook binds DOM targets to React refs only — a plain element, a getter or
 * a callback ref is not accepted, so every test wraps its element in a
 * `{ current }` holder.
 */
function refOf<T>(value: T | null): RefObject<T | null> {
  return { current: value }
}

/**
 * Let two rendering frames pass plus a slack timeout — the platform
 * `ResizeObserver` delivers asynchronously per frame, so a deterministic
 * "nothing was delivered" assertion has to wait out a couple of frames.
 */
async function settleFrames(): Promise<void> {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  await new Promise<void>(resolve => setTimeout(resolve, 50))
}

// The element uses `box-sizing: border-box` with a 200x100 outer size,
// 10px padding and 5px border on each side, so:
//   - border-box measurement => 200 x 100
//   - content-box measurement => 200 - 20 - 10 = 170 wide, 100 - 20 - 10 = 70 tall
describe('useElementSize', () => {
  let el: HTMLDivElement

  beforeEach(() => {
    el = document.createElement('div')
    el.style.cssText = 'width: 200px; height: 100px; padding: 10px; border: 5px solid black; box-sizing: border-box;'
    document.body.appendChild(el)
  })

  afterEach(() => {
    el.remove()
  })

  it('accepts only a React ref object as the DOM target', () => {
    expectTypeOf<Parameters<typeof useElementSize>[0]>()
      .toEqualTypeOf<ElementTarget>()
    // a plain element is deliberately rejected — refs are the only DOM target
    expectTypeOf<HTMLDivElement>()
      .not
      .toMatchTypeOf<Parameters<typeof useElementSize>[0]>()
  })

  it('should prefill with border-box dimensions when box is border-box', async () => {
    const { result } = await renderHook(() => useElementSize(refOf(el), { width: 0, height: 0 }, { box: 'border-box' }))

    expect(result.current.width).toBe(200)
    expect(result.current.height).toBe(100)
  })

  it('should prefill with content-box dimensions when box is content-box', async () => {
    const { result } = await renderHook(() => useElementSize(refOf(el), { width: 0, height: 0 }, { box: 'content-box' }))

    expect(result.current.width).toBe(170)
    expect(result.current.height).toBe(70)
  })

  it('should prefill with content-box dimensions by default', async () => {
    const { result } = await renderHook(() => useElementSize(refOf(el)))

    expect(result.current.width).toBe(170)
    expect(result.current.height).toBe(70)
  })

  it('should keep the plain offsetWidth prefill when window is null', async () => {
    // `window: null` disables the computed-style prefill (mirrors upstream's
    // `box === 'content-box' && window` gate) — content-box falls back to the
    // raw offsetWidth/offsetHeight without subtracting padding and border.
    // That prefill is only observable before the ResizeObserver re-reports the
    // content box (which is also 170x70) and WebKit delivers that within the
    // same `renderHook` round-trip, so record the sizes as they render.
    const sizes: Array<{ width: number, height: number }> = []
    await renderHook(() => {
      const size = useElementSize(refOf(el), { width: 0, height: 0 }, { window: null as unknown as undefined, box: 'content-box' })
      sizes.push({ width: size.width, height: size.height })
      return size
    })

    // sizes[0] is the initial state, sizes[1] the mount-time prefill
    expect(sizes[0]).toEqual({ width: 0, height: 0 })
    expect(sizes[1]).toEqual({ width: 200, height: 100 })
  })

  it('updates width/height when the element is resized', async () => {
    const { result, unmount } = await renderHook(() =>
      useElementSize(refOf(el), { width: 0, height: 0 }, { box: 'border-box' }),
    )

    el.style.width = '300px'
    await expect.poll(() => result.current.width).toBe(300)
    expect(result.current.height).toBe(100)

    await unmount()
  })

  it('stop() disconnects the observer', async () => {
    const { result, unmount } = await renderHook(() =>
      useElementSize(refOf(el), { width: 0, height: 0 }, { box: 'border-box' }),
    )

    await expect.poll(() => result.current.width).toBe(200)

    result.current.stop()
    el.style.width = '320px'
    await settleFrames()
    expect(result.current.width).toBe(200)

    await unmount()
  })

  it('reports the size when a ref target attaches between renders', async () => {
    const ref = refOf<HTMLDivElement>(null)

    const { result, rerender, unmount } = await renderHook(
      (props?: { target: ElementTarget }) =>
        useElementSize(props?.target ?? ref),
      { initialProps: { target: ref } },
    )

    await settleFrames()
    expect(result.current.width).toBe(0)

    ref.current = el
    await rerender({ target: ref })
    await expect.poll(() => result.current.width).toBe(170)

    await unmount()
  })
})
