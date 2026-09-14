import type { RefObject } from 'react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useTextareaAutosize } from '../useTextareaAutosize'

function createMockTextarea(scrollHeight: number): {
  node: HTMLTextAreaElement
  element: RefObject<HTMLTextAreaElement | null>
} {
  const node = document.createElement('textarea')
  Object.defineProperty(node, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
  const element: RefObject<HTMLTextAreaElement | null> = { current: node }
  return { node, element }
}

function ControlledAutosizeDemo(props?: { maxHeight?: number }) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  useTextareaAutosize({ element: textarea, input, maxHeight: props?.maxHeight })

  return (
    <textarea
      ref={textarea}
      value={input}
      onChange={event => setInput(event.target.value)}
      placeholder="What's on your mind?"
      style={{ width: '200px', resize: 'none', scrollbarWidth: 'none' }}
    />
  )
}

function LateAttachedAutosizeDemo() {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  const [show, setShow] = useState(false)
  useTextareaAutosize({ element: textarea, input })

  return (
    <div>
      <button type="button" onClick={() => setShow(true)}>show</button>
      {show
        ? (
            <textarea
              ref={textarea}
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="What's on your mind?"
              style={{ width: '200px', resize: 'none', scrollbarWidth: 'none' }}
            />
          )
        : null}
    </div>
  )
}

describe('useTextareaAutosize', () => {
  it('should cap textarea height with maxHeight', async () => {
    const { node, element } = createMockTextarea(240)
    const { result, act } = await renderHook(() => useTextareaAutosize({ element, maxHeight: 120 }))

    // applied by the mount effect (upstream: `immediate: true` watch)
    expect(node.style.height).toBe('120px')

    await act(() => result.current.triggerResize())
    expect(node.style.height).toBe('120px')
  })

  it('should keep rows support with minHeight and maxHeight', async () => {
    const { node, element } = createMockTextarea(240)
    await renderHook(() => useTextareaAutosize({ element, maxHeight: 120, styleProp: 'minHeight' }))

    expect(node.style.minHeight).toBe('120px')
  })

  it('should set textarea height to scrollHeight when no maxHeight', async () => {
    const { node, element } = createMockTextarea(180)
    await renderHook(() => useTextareaAutosize({ element }))

    expect(node.style.height).toBe('180px')
  })

  it('should not resize when scrollHeight is below maxHeight', async () => {
    const { node, element } = createMockTextarea(80)
    await renderHook(() => useTextareaAutosize({ element, maxHeight: 120 }))

    expect(node.style.height).toBe('80px')
  })

  it('should apply height to styleTarget when provided', async () => {
    const { node, element } = createMockTextarea(240)
    const styleTarget: RefObject<HTMLElement | null> = { current: document.createElement('div') }
    await renderHook(() => useTextareaAutosize({ element, styleTarget, maxHeight: 120 }))

    expect(styleTarget.current?.style.height).toBe('120px')
    expect(node.style.height).toBe('')
  })

  it('should accept ref objects for element and styleTarget', async () => {
    const node = document.createElement('textarea')
    Object.defineProperty(node, 'scrollHeight', { configurable: true, value: 90 })
    const styleTarget = document.createElement('div')
    const element: RefObject<HTMLTextAreaElement | null> = { current: node }
    const styleTargetRef: RefObject<HTMLElement | null> = { current: styleTarget }

    await renderHook(() => useTextareaAutosize({ element, styleTarget: styleTargetRef }))

    expect(styleTarget.style.height).toBe('90px')
    expect(node.style.height).toBe('')
  })

  it('should return an object with paired setInput, textarea and triggerResize', async () => {
    const { node, element } = createMockTextarea(120)
    const { result, act } = await renderHook(() => useTextareaAutosize({ element }))

    expect(Array.isArray(result.current)).toBe(false)
    expect(Object.keys(result.current)).toEqual(['input', 'setInput', 'textarea', 'triggerResize'])
    expect(result.current.input).toBe('')
    expect(result.current.setInput).toBeTypeOf('function')
    expect(result.current.triggerResize).toBeTypeOf('function')
    // the `element` option is returned as the `textarea` ref
    expect(result.current.textarea.current).toBe(node)

    await act(() => result.current.setInput('hello'))
    expect(result.current.input).toBe('hello')

    Object.defineProperty(node, 'scrollHeight', { configurable: true, value: 200 })
    await act(() => result.current.triggerResize())
    expect(node.style.height).toBe('200px')
  })

  it('should call onResize when textarea scroll height changes', async () => {
    const { node, element } = createMockTextarea(100)
    const onResize = vi.fn()
    const { result, act } = await renderHook(() => useTextareaAutosize({ element, onResize }))

    // the mount resize moves the scroll height from the initial 1 to 100
    expect(onResize).toHaveBeenCalledTimes(1)

    // same scroll height — no additional call
    await act(() => result.current.triggerResize())
    expect(onResize).toHaveBeenCalledTimes(1)

    Object.defineProperty(node, 'scrollHeight', { configurable: true, value: 180 })
    await act(() => result.current.triggerResize())
    expect(onResize).toHaveBeenCalledTimes(2)
  })

  it('should resize only once on mount when watch is provided', async () => {
    const { node, element } = createMockTextarea(100)
    const onResize = vi.fn()
    await renderHook(() => useTextareaAutosize({ element, onResize, watch: [0] }))

    expect(node.style.height).toBe('100px')
    // upstream fires two mount watches, but the second one is a no-op
    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('should do nothing when textarea element is not set', async () => {
    const { result, act } = await renderHook(() => useTextareaAutosize())

    expect(result.current.textarea.current).toBeNull()
    await act(() => {
      expect(() => result.current.triggerResize()).not.toThrow()
    })
  })

  it('should auto-resize when the element is attached after mount', async () => {
    const node = document.createElement('textarea')
    Object.defineProperty(node, 'scrollHeight', { configurable: true, value: 120 })
    const element: RefObject<HTMLTextAreaElement | null> = { current: null }
    const { rerender } = await renderHook(() => useTextareaAutosize({ element }))

    expect(node.style.height).toBe('')

    element.current = node
    await rerender()

    // no manual triggerResize() — the commit-time resolver re-runs the resize
    await expect.poll(() => node.style.height).toBe('120px')
  })

  it('should trigger resize when watch source changes', async () => {
    const { node, element } = createMockTextarea(100)
    const { rerender } = await renderHook(
      (props?: { extra: number }) => useTextareaAutosize({ element, watch: [props?.extra ?? 0] }),
      { initialProps: { extra: 0 } },
    )

    expect(node.style.height).toBe('100px')

    Object.defineProperty(node, 'scrollHeight', { configurable: true, value: 220 })
    await rerender({ extra: 1 })

    expect(node.style.height).toBe('220px')
  })

  it('should deep-compare non-serializable watch values', async () => {
    const { node, element } = createMockTextarea(100)
    const { rerender } = await renderHook(
      (props?: { extra: Map<string, number> }) => useTextareaAutosize({ element, watch: [props?.extra ?? new Map()] }),
      { initialProps: { extra: new Map([['a', 1]]) } },
    )

    expect(node.style.height).toBe('100px')

    Object.defineProperty(node, 'scrollHeight', { configurable: true, value: 220 })
    // deep-equal Map — no resize
    await rerender({ extra: new Map([['a', 1]]) })
    expect(node.style.height).toBe('100px')

    // deep change — resize (JSON.stringify would collapse both Maps to `{}`)
    await rerender({ extra: new Map([['a', 2]]) })
    expect(node.style.height).toBe('220px')
  })

  it('should resize when a function watch value changes identity', async () => {
    const { node, element } = createMockTextarea(100)
    const first = () => 1
    const second = () => 1
    const { rerender } = await renderHook(
      (props?: { fn: () => number }) => useTextareaAutosize({ element, watch: [props?.fn ?? first] }),
      { initialProps: { fn: first } },
    )

    expect(node.style.height).toBe('100px')

    Object.defineProperty(node, 'scrollHeight', { configurable: true, value: 220 })
    await rerender({ fn: second })

    expect(node.style.height).toBe('220px')
  })

  it('should autosize a real textarea as the content changes', async () => {
    const screen = await render(<ControlledAutosizeDemo />)
    const locator = screen.getByRole('textbox')
    const node = locator.element() as HTMLTextAreaElement

    await locator.fill(`line\n`.repeat(12))
    await expect.poll(() => Number.parseInt(node.style.height || '0', 10)).toBeGreaterThan(60)
    const grown = Number.parseInt(node.style.height, 10)

    await locator.fill('one line')
    await expect.poll(() => Number.parseInt(node.style.height || '0', 10)).toBeLessThan(grown)
  })

  it('should clamp a real textarea to maxHeight', async () => {
    const screen = await render(<ControlledAutosizeDemo maxHeight={60} />)
    const locator = screen.getByRole('textbox')
    const node = locator.element() as HTMLTextAreaElement

    await locator.fill(`line\n`.repeat(12))
    await expect.poll(() => node.style.height).toBe('60px')
  })

  it('should autosize a textarea attached after mount without a manual trigger', async () => {
    const screen = await render(<LateAttachedAutosizeDemo />)
    expect(screen.getByRole('textbox').query()).toBeNull()

    await screen.getByRole('button', { name: 'show' }).click()
    const node = screen.getByRole('textbox').element() as HTMLTextAreaElement

    // the commit-time resolver resizes the newly attached element
    await expect.poll(() => node.style.height).not.toBe('')

    await screen.getByRole('textbox').fill(`line\n`.repeat(12))
    await expect.poll(() => Number.parseInt(node.style.height || '0', 10)).toBeGreaterThan(60)
  })

  it('should re-measure when the element width changes (ResizeObserver)', async () => {
    const screen = await render(<ControlledAutosizeDemo />)
    const locator = screen.getByRole('textbox')
    const node = locator.element() as HTMLTextAreaElement

    await locator.fill('a fairly long single line that wraps very differently depending on the width of the textarea element')
    await expect.poll(() => node.style.height).not.toBe('')
    const before = node.style.height

    node.style.width = '80px'
    await expect.poll(() => node.style.height).not.toBe(before)
  })

  it('should disconnect the ResizeObserver on unmount', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const node = document.createElement('textarea')
    node.style.width = '300px'
    host.appendChild(node)
    const element: RefObject<HTMLTextAreaElement | null> = { current: node }

    try {
      const { result, act, unmount } = await renderHook(() => useTextareaAutosize({ element }))
      await act(() => {
        node.value = `line\n`.repeat(6)
        result.current.triggerResize()
      })
      await expect.poll(() => node.style.height).not.toBe('')
      const heightBefore = node.style.height

      unmount()
      node.style.width = '80px'
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(node.style.height).toBe(heightBefore)
    }
    finally {
      host.remove()
    }
  })

  it('should resize a controlled React textarea through onChange', async () => {
    const screen = await render(<ControlledAutosizeDemo />)
    const node = screen.getByRole('textbox').element() as HTMLTextAreaElement

    await screen.getByRole('textbox').fill(`line\n`.repeat(8))
    await expect.poll(() => Number.parseInt(node.style.height || '0', 10)).toBeGreaterThan(60)
  })
})
