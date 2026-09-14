import type { RefObject } from 'react'
import type { ElementTargetOrArray } from '../useResizeObserver'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useResizeObserver } from '../useResizeObserver'

class StubResizeObserver {
  static instances: StubResizeObserver[] = []

  callback: ResizeObserverCallback
  observed: Element[] = []
  disconnected = false

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    StubResizeObserver.instances.push(this)
  }

  observe(target: Element, _options?: ResizeObserverOptions): void {
    this.observed.push(target)
  }

  unobserve(_target: Element): void {}

  disconnect(): void {
    this.disconnected = true
  }

  trigger(list: ResizeObserverEntry[]): void {
    this.callback(list, this as unknown as ResizeObserver)
  }
}

function createStubWindow(withObserver = true): Window {
  StubResizeObserver.instances = []
  const win: Record<string, unknown> = {}
  if (withObserver)
    win.ResizeObserver = StubResizeObserver
  return win as unknown as Window
}

function appendElement(width: string, height: string): HTMLDivElement {
  const element = document.createElement('div')
  element.style.width = width
  element.style.height = height
  document.body.appendChild(element)
  return element
}

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

describe('useResizeObserver', () => {
  it('accepts a React ref object as the only DOM target form', () => {
    expectTypeOf<ElementTargetOrArray<HTMLElement>>()
      .toMatchTypeOf<RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[]>()
    // a plain element is deliberately rejected — refs are the only DOM target
    expectTypeOf<HTMLElement>()
      .not
      .toMatchTypeOf<ElementTargetOrArray<HTMLElement>>()
    // the callback form of React's `Ref<T>` is rejected too
    expectTypeOf<(instance: HTMLElement | null) => void>()
      .not
      .toMatchTypeOf<ElementTargetOrArray<HTMLElement>>()
  })

  it('reports the initial size and subsequent resizes of an attached element', async () => {
    const element = appendElement('100px', '50px')
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }

    const { unmount } = await renderHook(() => useResizeObserver(refOf(element), collect))

    // the platform observer delivers the current sizes once observed
    await expect.poll(() => entries.length).toBeGreaterThan(0)

    element.style.width = '200px'
    await expect.poll(() => entries.at(-1)?.contentRect.width).toBe(200)

    await unmount()
    element.remove()
  })

  it('delivers an empty rect while detached and the real size after attaching', async () => {
    const element = document.createElement('div')
    element.style.width = '80px'
    element.style.height = '40px'
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }

    const { unmount } = await renderHook(() => useResizeObserver(refOf(element), collect))

    // platform semantics: a detached element has no rendered box, so any
    // initial delivery reports a zero rect — never the styled size
    await settleFrames()
    for (const entry of entries) {
      expect(entry.contentRect.width).toBe(0)
      expect(entry.contentRect.height).toBe(0)
    }

    document.body.appendChild(element)
    await expect.poll(() => entries.at(-1)?.contentRect.width).toBe(80)

    await unmount()
    element.remove()
  })

  it('stop() disconnects the observer', async () => {
    const element = appendElement('100px', '50px')
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }

    const { result, unmount } = await renderHook(() => useResizeObserver(refOf(element), collect))

    await expect.poll(() => entries.length).toBeGreaterThan(0)
    expect(result.current.isSupported).toBe(true)

    result.current.stop()
    await settleFrames()

    const count = entries.length
    element.style.width = '300px'
    await settleFrames()
    expect(entries.length).toBe(count)

    await unmount()
    element.remove()
  })

  it('disconnects on unmount', async () => {
    const element = appendElement('100px', '50px')
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }

    const { unmount } = await renderHook(() => useResizeObserver(refOf(element), collect))

    await expect.poll(() => entries.length).toBeGreaterThan(0)
    await unmount()

    const count = entries.length
    element.style.width = '300px'
    await settleFrames()
    expect(entries.length).toBe(count)
    element.remove()
  })

  it('re-observes when a ref target attaches between renders', async () => {
    const element = appendElement('100px', '50px')
    const ref = refOf<HTMLDivElement>(null)
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }

    const { rerender, unmount } = await renderHook(
      (props?: { target: ElementTargetOrArray }) =>
        useResizeObserver(props?.target ?? refOf(null), collect),
      { initialProps: { target: ref } },
    )

    await settleFrames()
    expect(entries.length).toBe(0)

    ref.current = element
    await rerender({ target: ref })
    await expect.poll(() => entries.length).toBeGreaterThan(0)

    await unmount()
    element.remove()
  })

  it('re-observes when the target swaps to another element', async () => {
    const first = appendElement('100px', '50px')
    const second = appendElement('120px', '60px')
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }

    const { rerender, unmount } = await renderHook(
      (props?: { target: ElementTargetOrArray }) =>
        useResizeObserver(props?.target ?? refOf(null), collect),
      { initialProps: { target: refOf(first) } },
    )

    await expect.poll(() => entries.length).toBeGreaterThan(0)

    await rerender({ target: refOf(second) })
    await expect.poll(() => entries.at(-1)?.target).toBe(second)

    second.style.width = '240px'
    await expect.poll(() => entries.at(-1)?.contentRect.width).toBe(240)

    await unmount()
    first.remove()
    second.remove()
  })

  it('observes an array of targets', async () => {
    const first = appendElement('100px', '50px')
    const second = appendElement('120px', '60px')
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }

    const { unmount } = await renderHook(() =>
      useResizeObserver([refOf(first), refOf(second)], collect),
    )

    await expect.poll(() => entries.some(entry => entry.target === first)).toBe(true)
    await expect.poll(() => entries.some(entry => entry.target === second)).toBe(true)

    await unmount()
    first.remove()
    second.remove()
  })

  it('passes the box option through to the platform observer', async () => {
    const element = appendElement('100px', '50px')
    element.style.border = '10px solid transparent'
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }

    const { unmount } = await renderHook(() =>
      useResizeObserver(refOf(element), collect, { box: 'border-box' }),
    )

    await expect.poll(() => entries.length).toBeGreaterThan(0)
    // content box stays 100px wide while the border box is 120px
    expect(entries[0]?.contentRect.width).toBe(100)
    expect(entries[0]?.borderBoxSize[0]?.inlineSize).toBe(120)

    // only the border box changes — observed because box: 'border-box'
    element.style.borderLeftWidth = '20px'
    await expect.poll(() => entries.at(-1)?.borderBoxSize[0]?.inlineSize).toBe(130)

    await unmount()
    element.remove()
  })

  it('honors a custom window option and does not re-observe on callback changes', async () => {
    const element = appendElement('100px', '50px')
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }
    const win = createStubWindow()

    const { result, rerender, unmount } = await renderHook(
      (props?: { callback: ResizeObserverCallback }) =>
        useResizeObserver(refOf(element), props?.callback ?? collect, { window: win }),
      { initialProps: { callback: collect } },
    )

    expect(result.current.isSupported).toBe(true)
    expect(StubResizeObserver.instances).toHaveLength(1)
    expect(StubResizeObserver.instances[0]?.observed).toEqual([element])

    // changing the callback must NOT re-observe, but the new callback
    // receives subsequent deliveries
    const latest: ResizeObserverEntry[] = []
    const replacement = (list: ReadonlyArray<ResizeObserverEntry>) => {
      latest.push(...list)
    }
    await rerender({ callback: replacement })
    expect(StubResizeObserver.instances).toHaveLength(1)

    StubResizeObserver.instances[0]?.trigger([{ target: element } as unknown as ResizeObserverEntry])
    expect(latest).toHaveLength(1)

    result.current.stop()
    expect(StubResizeObserver.instances[0]?.disconnected).toBe(true)

    await unmount()
    element.remove()
  })

  it('reports isSupported false without platform support', async () => {
    const element = appendElement('100px', '50px')
    const entries: ResizeObserverEntry[] = []
    const collect = (list: ReadonlyArray<ResizeObserverEntry>) => {
      entries.push(...list)
    }
    const win = createStubWindow(false)

    const { result, unmount } = await renderHook(() =>
      useResizeObserver(refOf(element), collect, { window: win }),
    )

    expect(result.current.isSupported).toBe(false)

    element.style.width = '300px'
    await settleFrames()
    expect(entries.length).toBe(0)

    await unmount()
    element.remove()
  })
})
