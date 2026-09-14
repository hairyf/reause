import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useDraggable } from '../useDraggable'

const basePointerEventOptions = {
  bubbles: true,
  cancelable: true,
  pointerType: 'mouse',
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface AutoScrollOptions {
  initialValue?: { x: number, y: number }
  autoScroll?: { margin: number, speed: number }
}

const defaultAutoScrollOptions = {
  initialValue: { x: 100, y: 100 },
  autoScroll: { margin: 30, speed: 2 },
}

function withAutoScrollDefaults(opts: AutoScrollOptions = {}) {
  return {
    initialValue: opts.initialValue ?? defaultAutoScrollOptions.initialValue,
    autoScroll: opts.autoScroll ?? defaultAutoScrollOptions.autoScroll,
  }
}

function mountDraggableAutoScroll(opts: AutoScrollOptions = {}) {
  const { initialValue, autoScroll } = withAutoScrollDefaults(opts)
  const container = document.createElement('div')
  container.style.width = '300px'
  container.style.height = '200px'
  container.style.overflow = 'auto'
  container.style.border = '1px solid black'
  container.style.boxSizing = 'border-box'
  container.style.scrollbarWidth = 'none'

  const inner = document.createElement('div')
  inner.style.width = '1000px'
  inner.style.height = '1000px'
  inner.style.position = 'relative'

  const el = document.createElement('div')
  el.style.width = '100px'
  el.style.height = '100px'
  el.style.position = 'absolute'
  el.style.top = '100px'
  el.style.left = '100px'
  el.style.background = 'darkslategray'

  inner.appendChild(el)
  container.appendChild(inner)
  document.body.appendChild(container)

  return { container, el, initialValue, autoScroll }
}

function getMove({
  axis,
  containerRect,
  el,
  margin = 30,
  offset,
}: {
  axis: 'x' | 'y'
  containerRect: DOMRect
  el: HTMLElement
  margin?: number
  offset: number
}) {
  if (axis === 'x') {
    const scrollTriggerX = containerRect.right - margin
    const leftEdge = scrollTriggerX - el.offsetWidth
    return leftEdge + offset
  }
  else {
    const scrollTriggerY = containerRect.bottom - margin
    const topEdge = scrollTriggerY - el.offsetHeight
    return topEdge + offset
  }
}

describe('useDraggable', () => {
  let el: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.margin = '0'
    el = document.createElement('div')
    el.style.width = '100px'
    el.style.height = '100px'
    document.body.appendChild(el)
  })

  it('should be defined', () => {
    expect(useDraggable).toBeDefined()
  })

  describe('core functionality', () => {
    it('should have default values', async () => {
      const { result } = await renderHook(() => useDraggable({ current: undefined }))

      expect(result.current.x).toBe(0)
      expect(result.current.y).toBe(0)
      expect(result.current.isDragging).toBe(false)
      expect(result.current.style).toContain('left: 0px')
      expect(result.current.style).toContain('top: 0px')
    })

    it('should respect initial values', async () => {
      const { result } = await renderHook(() => useDraggable({ current: el }, { initialValue: { x: 100, y: 200 } }))

      expect(result.current.x).toBe(100)
      expect(result.current.y).toBe(200)
      expect(result.current.style).toContain('left: 100px')
      expect(result.current.style).toContain('top: 200px')
    })

    it('should accept a ref-like { current } target', async () => {
      const targetRef: { current: HTMLElement | null } = { current: el }
      const { result, act } = await renderHook(() => useDraggable(targetRef))

      await act(() => {
        targetRef.current?.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
      })
      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 7 }))
      })
      expect(result.current.x).toBe(5)
      expect(result.current.y).toBe(7)
    })

    it('should accept an inline ref target', async () => {
      const { result, act } = await renderHook(() => useDraggable({ current: el }))

      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
      })
      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 7 }))
      })
      expect(result.current.x).toBe(5)
      expect(result.current.y).toBe(7)
    })
  })

  describe('basic functionality (mirrors upstream index.test.ts)', () => {
    it('basic drag flow with callbacks', async () => {
      const onStart = vi.fn()
      const onMove = vi.fn()
      const onEnd = vi.fn()

      const { result, act } = await renderHook(() => useDraggable({ current: el }, {
        preventDefault: true,
        onMove,
        onEnd,
        onStart,
      }))

      expect(result.current.x).toBe(0)
      expect(result.current.y).toBe(0)
      expect(result.current.isDragging).toBe(false)
      expect(onStart).not.toBeCalled()
      expect(onMove).not.toBeCalled()
      expect(onEnd).not.toBeCalled()

      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
      })
      expect(onStart).toHaveBeenCalledOnce()
      expect(onMove).not.toBeCalled()
      expect(onEnd).not.toBeCalled()
      expect(result.current.isDragging).toBe(true)

      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 20 }))
      })
      expect(onMove).toHaveBeenCalledOnce()
      expect(onEnd).not.toBeCalled()
      expect(result.current.x).toBe(10)
      expect(result.current.y).toBe(20)
      expect(result.current.style).toContain('left: 10px')
      expect(result.current.style).toContain('top: 20px')
      expect(result.current.isDragging).toBe(true)

      await act(() => {
        window.dispatchEvent(new PointerEvent('pointerup'))
      })
      expect(onEnd).toHaveBeenCalledOnce()
      expect(result.current.x).toBe(10)
      expect(result.current.y).toBe(20)
      expect(result.current.isDragging).toBe(false)
    })

    it('ends the drag when the pointer is canceled', async () => {
      const onEnd = vi.fn()

      const { result, act } = await renderHook(() => useDraggable({ current: el }, { onEnd }))

      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
      })
      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 20 }))
      })
      expect(result.current.isDragging).toBe(true)

      await act(() => {
        window.dispatchEvent(new PointerEvent('pointercancel'))
      })
      expect(onEnd).toHaveBeenCalledOnce()
      expect(result.current.isDragging).toBe(false)
    })

    it('does not start dragging when onStart returns false', async () => {
      const onStart = vi.fn(() => false as const)

      const { result, act } = await renderHook(() => useDraggable({ current: el }, { onStart }))

      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
      })
      expect(onStart).toHaveBeenCalledOnce()
      expect(result.current.isDragging).toBe(false)

      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 20 }))
      })
      expect(result.current.x).toBe(0)
      expect(result.current.y).toBe(0)
    })
  })

  describe('drag behavior (mirrors upstream index.browser.test.ts)', () => {
    it('should support dragging behavior to the correct position', async () => {
      const initialValue = { x: 50, y: 50 }

      const { result, act } = await renderHook(() => useDraggable({ current: el }, { initialValue }))

      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, ...basePointerEventOptions }))
      })
      expect(result.current.isDragging).toBe(true)
      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 30, ...basePointerEventOptions }))
      })

      expect(result.current.x).toBe(50)
      expect(result.current.y).toBe(30)
    })

    it('should respect axis constraints during drag operations', async () => {
      const initialValue = { x: 50, y: 50 }

      const { result, act } = await renderHook(() => useDraggable({ current: el }, { initialValue, axis: 'y' }))

      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, ...basePointerEventOptions }))
      })
      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 30, ...basePointerEventOptions }))
      })

      expect(result.current.x).toBe(initialValue.x)
      expect(result.current.y).toBe(30)
    })

    it('should disable dragging behaviour', async () => {
      const initialValue = { x: 50, y: 50 }

      const { result, act } = await renderHook(() => useDraggable({ current: el }, { initialValue, disabled: true }))

      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, ...basePointerEventOptions }))
      })
      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 30, ...basePointerEventOptions }))
      })

      expect(result.current.isDragging).toBe(false)
      expect(result.current.x).toBe(initialValue.x)
      expect(result.current.y).toBe(initialValue.y)
    })

    it('should update position when x/y changed via setX/setY', async () => {
      const { result, act } = await renderHook(() => useDraggable({ current: el }))

      await act(() => {
        result.current.setX(50)
        result.current.setY(75)
      })

      expect(result.current.x).toBe(50)
      expect(result.current.y).toBe(75)
      expect(result.current.position).toEqual({ x: 50, y: 75 })
      expect(result.current.style).toContain('left: 50px')
      expect(result.current.style).toContain('top: 75px')
    })

    it('should filter dragging by the allowed mouse buttons', async () => {
      const { result, act } = await renderHook(() => useDraggable({ current: el }))

      // default `buttons: [0]` — a right-button (2) drag must not start
      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 2, ...basePointerEventOptions }))
      })
      expect(result.current.isDragging).toBe(false)
      await act(() => {
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10, ...basePointerEventOptions }))
      })
      expect(result.current.x).toBe(0)
      expect(result.current.y).toBe(0)
    })

    it('should respect a custom buttons option', async () => {
      const { result, act } = await renderHook(() => useDraggable({ current: el }, { buttons: [2] }))

      await act(() => {
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 2, ...basePointerEventOptions }))
      })

      expect(result.current.isDragging).toBe(true)
    })

    it('should restrict the element within the container viewport with restrictInView', async () => {
      // scrollable 300x200 container holding a 100x100 draggable inside a
      // 1000x1000 content area
      const container = document.createElement('div')
      container.style.width = '300px'
      container.style.height = '200px'
      container.style.overflow = 'auto'
      const inner = document.createElement('div')
      inner.style.width = '1000px'
      inner.style.height = '1000px'
      const dragEl = document.createElement('div')
      dragEl.style.width = '100px'
      dragEl.style.height = '100px'
      dragEl.style.position = 'absolute'
      dragEl.style.left = '100px'
      dragEl.style.top = '100px'
      inner.appendChild(dragEl)
      container.appendChild(inner)
      document.body.appendChild(container)

      try {
        const { result, act } = await renderHook(() => useDraggable({ current: dragEl }, {
          initialValue: { x: 100, y: 100 },
          containerElement: { current: container },
          restrictInView: true,
        }))

        await act(() => {
          dragEl.dispatchEvent(new PointerEvent('pointerdown', { clientX: 150, clientY: 150, ...basePointerEventOptions }))
        })
        await act(() => {
          window.dispatchEvent(new PointerEvent('pointermove', { clientX: 1500, clientY: 1500, ...basePointerEventOptions }))
        })

        // the container clamp alone allows up to scrollWidth - 100 = 900;
        // restrictInView keeps the element within the visible area instead:
        // clientWidth - 100 = 200 and clientHeight - 100 = 100
        expect(result.current.x).toBe(200)
        expect(result.current.y).toBe(100)
      }
      finally {
        container.remove()
      }
    })
  })

  // The upstream auto-scroll cases are chromium-only (`it.runIf(isChromium())`)
  // — the browser project always runs chromium, so they are ported verbatim.
  describe('autoScroll (mirrors upstream index.browser.test.ts)', () => {
    async function simulateAutoScrollDrag({
      container,
      el,
      pointerdown,
      pointermove,
      duration = 300,
      interval = 1000 / 60,
    }: {
      container: HTMLElement
      el: HTMLElement
      pointerdown: { x: number, y: number }
      pointermove: { x: number, y: number }
      duration?: number
      interval?: number
    }) {
      container.scrollLeft = 0
      container.scrollTop = 0

      el.dispatchEvent(new PointerEvent('pointerdown', {
        ...basePointerEventOptions,
        clientX: pointerdown.x,
        clientY: pointerdown.y,
      }))

      const startTime = Date.now()
      while (Date.now() - startTime < duration) {
        window.dispatchEvent(new PointerEvent('pointermove', {
          ...basePointerEventOptions,
          clientX: pointermove.x,
          clientY: pointermove.y,
        }))
        await wait(interval)
      }
    }

    function dispatchPointerUp() {
      window.dispatchEvent(new PointerEvent('pointerup', basePointerEventOptions))
    }

    it('should auto-scroll horizontally when dragging near right edge', async () => {
      const { container, el, initialValue, autoScroll } = mountDraggableAutoScroll()
      const { unmount } = await renderHook(() => useDraggable({ current: el }, {
        initialValue,
        autoScroll,
        containerElement: { current: container },
      }))

      const dragOffset = 10
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      await simulateAutoScrollDrag({
        container,
        el,
        pointerdown: { x: elRect.left + dragOffset, y: elRect.top + dragOffset },
        pointermove: { x: getMove({ axis: 'x', containerRect, el, offset: dragOffset }), y: 0 },
      })

      expect(container.scrollTop).toBe(0)
      expect(container.scrollLeft).toBeGreaterThanOrEqual(20)

      dispatchPointerUp()
      await unmount()
    })

    it('should auto-scroll vertically when dragging near bottom edge', async () => {
      const { container, el, initialValue, autoScroll } = mountDraggableAutoScroll()
      const { unmount } = await renderHook(() => useDraggable({ current: el }, {
        initialValue,
        autoScroll,
        containerElement: { current: container },
      }))

      const dragOffset = 10
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      await simulateAutoScrollDrag({
        container,
        el,
        pointerdown: { x: elRect.left + dragOffset, y: elRect.top + dragOffset },
        pointermove: { x: 0, y: getMove({ axis: 'y', containerRect, el, offset: dragOffset }) },
      })

      expect(container.scrollLeft).toBe(0)
      expect(container.scrollTop).toBeGreaterThanOrEqual(20)

      dispatchPointerUp()
      await unmount()
    })

    it('should NOT auto-scroll when dragging outside the margin', async () => {
      const { container, el, initialValue, autoScroll } = mountDraggableAutoScroll()
      const { unmount } = await renderHook(() => useDraggable({ current: el }, {
        initialValue,
        autoScroll,
        containerElement: { current: container },
      }))

      const dragOffset = 10
      const marginOffset = 2
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      await simulateAutoScrollDrag({
        container,
        el,
        pointerdown: { x: elRect.left + dragOffset, y: elRect.top + dragOffset },
        pointermove: {
          x: getMove({ axis: 'x', containerRect, el, offset: dragOffset - marginOffset }),
          y: getMove({ axis: 'y', containerRect, el, offset: dragOffset - marginOffset }),
        },
      })

      expect(container.scrollLeft).toBe(0)
      expect(container.scrollTop).toBe(0)

      dispatchPointerUp()
      await unmount()
    })

    it('should auto-scroll both axes when dragging in the bottom-right corner', async () => {
      const { container, el, initialValue, autoScroll } = mountDraggableAutoScroll()
      const { unmount } = await renderHook(() => useDraggable({ current: el }, {
        initialValue,
        autoScroll,
        containerElement: { current: container },
      }))

      const dragOffset = 10
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const moveX = getMove({ axis: 'x', containerRect, el, offset: dragOffset })
      const moveY = getMove({ axis: 'y', containerRect, el, offset: dragOffset })

      await simulateAutoScrollDrag({
        container,
        el,
        pointerdown: { x: elRect.left + dragOffset, y: elRect.top + dragOffset },
        pointermove: { x: moveX, y: moveY },
      })

      expect(container.scrollLeft).toBeGreaterThanOrEqual(20)
      expect(container.scrollTop).toBeGreaterThanOrEqual(20)

      dispatchPointerUp()
      await unmount()
    })

    it('should respect custom scroll speed configuration', async () => {
      const customSpeed = 5
      const { container, el, initialValue, autoScroll } = mountDraggableAutoScroll({
        autoScroll: { margin: 30, speed: customSpeed },
      })
      const { unmount } = await renderHook(() => useDraggable({ current: el }, {
        initialValue,
        autoScroll,
        containerElement: { current: container },
      }))

      const dragOffset = 10
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      await simulateAutoScrollDrag({
        container,
        el,
        pointerdown: { x: elRect.left + dragOffset, y: elRect.top + dragOffset },
        pointermove: { x: getMove({ axis: 'x', containerRect, el, offset: dragOffset }), y: 0 },
        duration: 500,
      })

      // auto-scroll advances by `speed` px per timer tick, so the total after a
      // fixed 500ms window depends on the engine's tick rate (WebKit delivers
      // fewer ticks) — keep dragging until the custom speed has clearly
      // out-scrolled the default one
      await vi.waitFor(() => {
        expect(container.scrollLeft).toBeGreaterThan(130)
      }, { timeout: 5000 })

      dispatchPointerUp()
      await unmount()
    })
  })
})
