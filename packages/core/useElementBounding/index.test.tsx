import type { RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useElementBounding } from '../useElementBounding'

/**
 * The hook binds DOM targets to React refs only — a plain element, a getter or
 * a callback ref is not accepted, so every test wraps its element in a
 * `{ current }` holder.
 */
function refOf<T>(value: T | null): RefObject<T | null> {
  return { current: value }
}

interface BoundingSnapshot {
  height: number
  bottom: number
  left: number
  right: number
  top: number
  width: number
  x: number
  y: number
}

function snapshot(result: { current: ReturnType<typeof useElementBounding> }): BoundingSnapshot {
  const { height, bottom, left, right, top, width, x, y } = result.current
  return { height, bottom, left, right, top, width, x, y }
}

/**
 * A `position: fixed` element at the viewport origin, so `getBoundingClientRect`
 * reports deterministic coordinates regardless of page layout.
 */
function createElement(width = 200, height = 50): HTMLDivElement {
  const div = document.createElement('div')
  div.style.position = 'fixed'
  div.style.left = '0'
  div.style.top = '0'
  div.style.margin = '0'
  div.style.width = `${width}px`
  div.style.height = `${height}px`
  document.body.appendChild(div)
  return div
}

const ZERO_SNAPSHOT: BoundingSnapshot = {
  height: 0,
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
}

describe('useElementBounding', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.margin = '0'
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.margin = ''
  })

  it('should be defined', () => {
    expect(useElementBounding).toBeDefined()
  })

  it('should return width and height of element', async () => {
    const el = createElement()
    const { result, unmount } = await renderHook(() => useElementBounding(refOf(el)))

    expect(snapshot(result)).toEqual({
      height: 50,
      bottom: 50,
      left: 0,
      right: 200,
      top: 0,
      width: 200,
      x: 0,
      y: 0,
    })

    await unmount()
  })

  it('should have reactive values', async () => {
    const el = createElement()
    const { result, unmount } = await renderHook(() => useElementBounding(refOf(el)))

    expect(result.current.width).toBe(200)

    el.style.width = '34px'
    el.style.left = '69px'
    el.style.top = '69px'

    // `width` is delivered by the ResizeObserver / MutationObserver; the
    // position updates follow in the same re-measure.
    await expect.poll(() => result.current.width).toBe(34)
    expect(snapshot(result)).toEqual({
      height: 50,
      bottom: 119,
      left: 69,
      right: 103,
      top: 69,
      width: 34,
      x: 69,
      y: 69,
    })

    await unmount()
  })

  it('should respect padding and margin', async () => {
    const el = createElement()
    el.style.width = '400px'
    el.style.height = '50px'
    el.style.padding = '123px'
    const { result, unmount } = await renderHook(() => useElementBounding(refOf(el)))

    // `box-sizing` defaults to `content-box`, so the border-box (what
    // `getBoundingClientRect` reports) is 400 + 123*2 = 646 wide and
    // 50 + 123*2 = 296 tall.
    expect(snapshot(result)).toEqual({
      height: 296,
      bottom: 296,
      left: 0,
      right: 646,
      top: 0,
      width: 646,
      x: 0,
      y: 0,
    })

    await unmount()
  })

  it('should reset values to 0 if el is unmounted', async () => {
    const el = createElement()
    const ref = refOf<HTMLDivElement>(el)
    const { result, rerender, unmount } = await renderHook(() => useElementBounding(ref))

    expect(result.current.width).toBe(200)

    el.remove()
    ref.current = null
    await rerender()

    expect(snapshot(result)).toEqual(ZERO_SNAPSHOT)

    await unmount()
  })

  it('should not reset values to 0 if el is unmounted with options.reset set to false', async () => {
    const el = createElement()
    const ref = refOf<HTMLDivElement>(el)
    const { result, rerender, unmount } = await renderHook(() =>
      useElementBounding(ref, { reset: false }),
    )

    const content = snapshot(result)
    expect(content).not.toEqual(ZERO_SNAPSHOT)

    el.remove()
    ref.current = null
    await rerender()

    expect(snapshot(result)).toEqual(content)

    await unmount()
  })

  it('should not update immediate with options.immediate set to false', async () => {
    const el = createElement()
    // Mount with a not-yet-attached element: with `immediate: false` nothing
    // is measured on mount, and there is no element to observe yet, so the
    // values stay deterministically 0 (upstream asserts the same right after
    // render, before the async observer deliveries).
    const ref = refOf<HTMLDivElement>(null)
    const { result, rerender, act, unmount } = await renderHook(() =>
      useElementBounding(ref, { immediate: false }),
    )

    expect(snapshot(result)).toEqual(ZERO_SNAPSHOT)

    ref.current = el
    await rerender()

    await act(() => {
      result.current.update()
    })

    expect(snapshot(result)).toEqual({
      height: 50,
      bottom: 50,
      left: 0,
      right: 200,
      top: 0,
      width: 200,
      x: 0,
      y: 0,
    })

    await unmount()
  })

  it.todo('should update when scolling')

  it.todo('should not update when scolling with options.windowScroll set to false')
})
