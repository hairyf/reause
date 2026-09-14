import type { UseClickOutsideControls } from '../useClickOutside'
import { useRef, useState } from 'react'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useClickOutside } from '../useClickOutside'

function getComplexComponent(useLateTarget = false) {
  return function ComplexComponent() {
    const target = useRef<HTMLDivElement>(null)
    // `ignore` takes plain elements now, not refs: the outside node is captured
    // through a callback ref + state so it is available on the render after it
    // attaches (the hook reads `ignore` through a latest-value ref)
    const [outside, setOutside] = useState<HTMLDivElement | null>(null)
    // the late-target variant keeps the resolved node in state and wraps it in
    // an inline ref object: it is `null` on the first render and appears after
    // the ref callback runs, so the hook must read the latest ref at event time
    const [element, setElement] = useState<HTMLDivElement | null>(null)
    useClickOutside(
      useLateTarget ? { current: element } : target,
      (event) => {
        // Mirrors the upstream test which spies on `console.log`
        // eslint-disable-next-line no-console
        console.log(event)
      },
      {
        ignore: outside ? [outside] : [],
      },
    )

    return (
      <div>
        <div ref={useLateTarget ? setElement : target}>
          Inside
        </div>

        <div ref={setOutside}>
          Outside
          <label>
            <input type="radio" />
            <span>Label</span>
          </label>
        </div>

        <div>
          Other
        </div>
      </div>
    )
  }
}

describe('useClickOutside', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('should work with ignored element', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ComplexComponent = getComplexComponent()
    const screen = await render(<ComplexComponent />)
    const target = screen.getByText('Inside')
    const outside = screen.getByText('Outside', { exact: false })
    const label = screen.getByText('Label')
    const other = screen.getByText('Other')

    await expect.element(target).toBeInTheDocument()
    await expect.element(outside).toBeInTheDocument()
    expect(consoleSpy).not.toHaveBeenCalled()
    await userEvent.click(outside)
    expect(consoleSpy).not.toHaveBeenCalled()
    await userEvent.click(label)
    expect(consoleSpy).not.toHaveBeenCalled()
    await userEvent.click(other)
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('should detect iframe inside shadow DOM with detectIframe option', async () => {
    const handler = vi.fn()

    function IframeComponent() {
      const target = useRef<HTMLDivElement>(null)
      useClickOutside(target, handler, { detectIframe: true })
      return (
        <div ref={target}>
          Inside
        </div>
      )
    }

    const screen = await render(<IframeComponent />)
    await expect.element(screen.getByText('Inside')).toBeInTheDocument()

    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')
    shadowRoot.appendChild(iframe)
    document.body.appendChild(host)

    // Focus the iframe — a real click on it moves focus into the iframe and
    // fires window `blur`; in the browser test environment `iframe.focus()`
    // is the reliable way to produce that focus shift (the upstream nested
    // shadow DOM test uses the same `.focus()` call).
    iframe.focus()
    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledOnce()
    })
  })

  it('should detect iframe inside nested shadow DOM with detectIframe option', async () => {
    const handler = vi.fn()

    function IframeComponent() {
      const target = useRef<HTMLDivElement>(null)
      useClickOutside(target, handler, { detectIframe: true })
      return (
        <div ref={target}>
          Inside
        </div>
      )
    }

    const screen = await render(<IframeComponent />)
    await expect.element(screen.getByText('Inside')).toBeInTheDocument()

    // <outer-host> > shadow-root > <inner-host> > shadow-root > <iframe>
    const outerHost = document.createElement('div')
    const outerShadow = outerHost.attachShadow({ mode: 'open' })
    const innerHost = document.createElement('div')
    const innerShadow = innerHost.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')
    innerShadow.appendChild(iframe)
    outerShadow.appendChild(innerHost)
    document.body.appendChild(outerHost)

    // Playwright cannot click an iframe nested 2 levels deep in shadow DOM
    iframe.focus()
    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledOnce()
    })
  })

  it('resolves a target that is only attached after the first commit', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ComplexComponent = getComplexComponent(true)
    const screen = await render(<ComplexComponent />)
    const target = screen.getByText('Inside')
    const other = screen.getByText('Other')

    await expect.element(target).toBeInTheDocument()
    await expect.element(other).toBeInTheDocument()
    expect(consoleSpy).not.toHaveBeenCalled()
    await userEvent.click(target)
    expect(consoleSpy).not.toHaveBeenCalled()
    await userEvent.click(other)
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('supports the controls option (stop / cancel / trigger)', async () => {
    const handler = vi.fn()
    const controlsBox: { current?: UseClickOutsideControls } = {}

    function ControlsComponent() {
      const target = useRef<HTMLDivElement>(null)
      controlsBox.current = useClickOutside(target, handler, { controls: true })
      return (
        <div>
          <div ref={target}>Inside</div>
          <div>Outside</div>
        </div>
      )
    }

    const screen = await render(<ControlsComponent />)
    const outside = screen.getByText('Outside')
    await expect.element(outside).toBeInTheDocument()

    // a real outside click still fires the handler with controls enabled
    await userEvent.click(outside)
    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce())

    // the hook only processes one click per tick (upstream `isProcessingClick`
    // guard), so every synthetic click below is followed by a timer flush
    const clickOutside = async () => {
      outside.element().dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    // `cancel()` suppresses the next click that reaches the handler…
    controlsBox.current!.cancel()
    await clickOutside()
    expect(handler).toHaveBeenCalledOnce()

    // …and is one-shot: the following click fires again
    await clickOutside()
    expect(handler).toHaveBeenCalledTimes(2)

    // `trigger(event)` force-fires the handler
    const event = new Event('click')
    Object.defineProperty(event, 'target', { value: outside.element() })
    controlsBox.current!.trigger(event)
    expect(handler).toHaveBeenCalledTimes(3)

    // upstream `trigger` leaves the listener cancelled again
    await clickOutside()
    expect(handler).toHaveBeenCalledTimes(3)

    // `stop()` removes every listener
    controlsBox.current!.stop()
    await clickOutside()
    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('types: returns the stop function by default and the controls object with controls', async () => {
    const target = { current: null as Element | null }
    const handler = () => {}

    const { result: stopResult } = await renderHook(() => useClickOutside(target, handler))
    expectTypeOf(stopResult.current).toEqualTypeOf<() => void>()

    const { result: controlsResult } = await renderHook(() =>
      useClickOutside(target, handler, { controls: true }),
    )
    expectTypeOf(controlsResult.current).toEqualTypeOf<UseClickOutsideControls>()
    expectTypeOf(controlsResult.current.stop).toEqualTypeOf<() => void>()
    expectTypeOf(controlsResult.current.cancel).toEqualTypeOf<() => void>()
    expectTypeOf(controlsResult.current.trigger).toEqualTypeOf<(event: Event) => void>()
  })
})
