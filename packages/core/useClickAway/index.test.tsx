import type { RefObject } from 'react'
import type { MockInstance } from 'vitest'
import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useClickAway } from '../useClickAway'

/**
 * Mirrors upstream's `__tests__/index.spec.ts`
 * (`source/ahooks/packages/hooks/src/useClickAway/__tests__/index.spec.ts`),
 * extended with the behaviours this port is contracted on: the shadow-DOM
 * listener root, single/array `eventName` symmetry, the missing-target branch,
 * the `useLatest` handler, and re-subscription when the resolved target moves.
 *
 * The regression this suite pins is the one that made the port unusable: the
 * targets used to be resolved during **render** (a `useMemo` keyed on the ref
 * object, which for a `useRef` handle never changes identity), so `ref.current`
 * was only ever read as `null` and every click counted as "outside" — clicking
 * the target itself fired the handler. Upstream re-resolves the targets in an
 * effect that runs after every commit, and the first two tests below render a
 * real ref through React so that the timing is the real one.
 */
describe('useClickAway', () => {
  let container: HTMLDivElement
  let container1: HTMLDivElement
  beforeEach(() => {
    container = document.createElement('div')
    container1 = document.createElement('div')
    container1.setAttribute('id', 'ele')
    document.body.appendChild(container)
    document.body.appendChild(container1)
  })

  afterEach(() => {
    container.remove()
    container1.remove()
    vi.restoreAllMocks()
  })

  /** Spy on one `EventTarget`'s registration calls for a single event name. */
  function spyOn(target: EventTarget, event: string) {
    const add: MockInstance = vi.spyOn(target, 'addEventListener' as never)
    const remove: MockInstance = vi.spyOn(target, 'removeEventListener' as never)
    return {
      adds: () => add.mock.calls.filter(call => call[0] === event).map(call => call[1]),
      removes: () => remove.mock.calls.filter(call => call[0] === event).map(call => call[1]),
    }
  }

  /** Dispatch `type` on `node` so `event.target` is exactly `node`. */
  function fire(node: EventTarget, type: string): void {
    node.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true }))
  }

  it('should be defined', () => {
    expect(useClickAway).toBeDefined()
  })

  it('ignores a click inside the ref target and fires on an outside click', async () => {
    const handler = vi.fn()

    function Demo() {
      const ref = useRef<HTMLDivElement>(null)
      useClickAway(ref, handler)

      return (
        <div>
          <div ref={ref}>Inside</div>
          <div>Outside</div>
        </div>
      )
    }

    const screen = await render(<Demo />)

    await userEvent.click(screen.getByText('Inside'))
    expect(handler).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('Outside'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('binds a ref that React attaches after the first commit', async () => {
    const handler = vi.fn()

    function Demo() {
      const [open, setOpen] = useState(false)
      const ref = useRef<HTMLDivElement>(null)
      useClickAway(ref, handler)

      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>open</button>
          {open && <div ref={ref}>Panel</div>}
        </div>
      )
    }

    const screen = await render(<Demo />)

    await userEvent.click(screen.getByText('open'))
    await expect.element(screen.getByText('Panel')).toBeInTheDocument()

    // React flushes a discrete click synchronously at the root container, so by
    // the time the event reaches the `document` listener the panel is already
    // mounted and `ref.current` is set — the opening click is an ordinary
    // outside click. What matters is what happens next: the target that did not
    // exist on the first commit now swallows its own clicks.
    handler.mockClear()

    await userEvent.click(screen.getByText('Panel'))
    expect(handler).not.toHaveBeenCalled()

    await userEvent.click(screen.getByText('open'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('swallows every click while a single target is not attached', async () => {
    // upstream `targets.some(...)`: an unresolved target is a match, so the
    // handler never fires — with no element to be inside of, the click is not
    // "outside" either
    const handler = vi.fn()
    await renderHook(() => useClickAway({ current: null }, handler))

    fire(container, 'click')
    fire(document.body, 'click')
    expect(handler).not.toHaveBeenCalled()
  })

  it('accepts a ref-like target', async () => {
    const handler = vi.fn()
    await renderHook(() => useClickAway({ current: container }, handler))

    fire(container, 'click')
    expect(handler).not.toHaveBeenCalled()

    fire(document.body, 'click')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('treats a click inside any target of an array as inside', async () => {
    const handler = vi.fn()
    await renderHook(() => useClickAway([{ current: container }, { current: container1 }], handler))

    fire(container, 'click')
    expect(handler).not.toHaveBeenCalled()

    fire(container1, 'click')
    expect(handler).not.toHaveBeenCalled()

    fire(document.body, 'click')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('swallows the click while any target of an array is missing', async () => {
    // Upstream `targets.some(...)`: one unresolved target is enough to short
    // circuit, so a half-attached pair never fires.
    const handler = vi.fn()
    await renderHook(() => useClickAway([{ current: container }, { current: null }], handler))

    fire(document.body, 'click')
    expect(handler).not.toHaveBeenCalled()
  })

  it('accepts a single eventName', async () => {
    const handler = vi.fn()
    const mousedown = spyOn(document, 'mousedown')
    const click = spyOn(document, 'click')
    await renderHook(() => useClickAway({ current: container }, handler, 'mousedown'))

    expect(mousedown.adds()).toHaveLength(1)
    expect(click.adds()).toHaveLength(0)

    fire(container, 'mousedown')
    expect(handler).not.toHaveBeenCalled()

    // `click` was never registered, so it cannot reach the handler
    fire(document.body, 'click')
    expect(handler).not.toHaveBeenCalled()

    fire(document.body, 'mousedown')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('accepts an array of eventNames, registers each one and removes each one', async () => {
    const handler = vi.fn()
    const mousedown = spyOn(document, 'mousedown')
    const touchstart = spyOn(document, 'touchstart')
    const click = spyOn(document, 'click')
    const { unmount } = await renderHook(() =>
      useClickAway({ current: container }, handler, ['mousedown', 'touchstart']))

    expect(mousedown.adds()).toHaveLength(1)
    expect(touchstart.adds()).toHaveLength(1)
    expect(click.adds()).toHaveLength(0)

    fire(document.body, 'mousedown')
    expect(handler).toHaveBeenCalledTimes(1)

    fire(document.body, 'touchstart')
    expect(handler).toHaveBeenCalledTimes(2)

    // inside the target neither event fires
    fire(container, 'mousedown')
    fire(container, 'touchstart')
    expect(handler).toHaveBeenCalledTimes(2)

    unmount()

    // per-event add/remove symmetry, matched by listener identity
    expect(mousedown.removes()).toHaveLength(1)
    expect(mousedown.removes()[0]).toBe(mousedown.adds()[0])
    expect(touchstart.removes()).toHaveLength(1)
    expect(touchstart.removes()[0]).toBe(touchstart.adds()[0])

    fire(document.body, 'mousedown')
    fire(document.body, 'touchstart')
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('does not re-bind on an equal-but-new eventName array', async () => {
    const mousedown = spyOn(document, 'mousedown')
    const touchstart = spyOn(document, 'touchstart')
    const { rerender } = await renderHook(({ name }: { name: (keyof DocumentEventMap)[] } = { name: ['mousedown', 'touchstart'] }) =>
      useClickAway({ current: container }, vi.fn(), name))

    expect(mousedown.adds()).toHaveLength(1)
    expect(touchstart.adds()).toHaveLength(1)

    // `depsAreSame` is element-wise, so an equal-but-new literal is inert
    await rerender({ name: ['mousedown', 'touchstart'] })
    expect(mousedown.adds()).toHaveLength(1)
    expect(touchstart.adds()).toHaveLength(1)
    expect(mousedown.removes()).toHaveLength(0)

    // a genuinely different set does re-bind
    await rerender({ name: ['mousedown'] })
    expect(mousedown.removes()).toHaveLength(1)
    expect(mousedown.adds()).toHaveLength(2)
  })

  it('reads the handler through useLatest: a new inline arrow does not re-register, yet the newest handler runs', async () => {
    const calls: number[] = []
    const log = spyOn(document, 'click')
    const { rerender } = await renderHook(({ by }: { by: number } = { by: 1 }) =>
      useClickAway({ current: container }, () => {
        calls.push(by)
      }))

    expect(log.adds()).toHaveLength(1)

    // two re-renders, each with a brand-new inline arrow
    await rerender({ by: 2 })
    await rerender({ by: 3 })

    // no re-registration: the listener is neither added again nor removed
    expect(log.adds()).toHaveLength(1)
    expect(log.removes()).toHaveLength(0)

    // …yet the newest closure runs
    fire(document.body, 'click')
    expect(calls).toEqual([3])

    fire(container, 'click')
    expect(calls).toEqual([3])
  })

  it('re-reads the target when it changes, even though the `document` root stays the same', async () => {
    const handler = vi.fn()
    const log = spyOn(document, 'click')
    const ref: RefObject<HTMLDivElement | null> = { current: container }
    const { rerender } = await renderHook(() => useClickAway(ref, handler))

    expect(log.adds()).toHaveLength(1)

    fire(container, 'click')
    fire(document.body, 'click')
    expect(handler).toHaveBeenCalledTimes(1)

    ref.current = container1
    await rerender()

    // the resolved elements changed, so upstream's target-aware effect
    // re-creates the subscription: 1 more add, and the old one detached
    expect(log.adds()).toHaveLength(2)
    expect(log.removes()).toHaveLength(1)

    // …and the *new* element is the one that swallows clicks now, while the old
    // one is outside again
    fire(container1, 'click')
    expect(handler).toHaveBeenCalledTimes(1)

    fire(container, 'click')
    expect(handler).toHaveBeenCalledTimes(2)

    fire(document.body, 'click')
    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('moves the listener when the target changes root, removing the old registration', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = document.createElement('div')
    shadow.appendChild(inner)

    const handler = vi.fn()
    const docLog = spyOn(document, 'click')
    const shadowLog = spyOn(shadow as unknown as EventTarget, 'click')
    const ref: RefObject<HTMLDivElement | null> = { current: container }
    const { rerender } = await renderHook(() => useClickAway(ref, handler))

    expect(docLog.adds()).toHaveLength(1)
    expect(shadowLog.adds()).toHaveLength(0)

    ref.current = inner
    await rerender()

    // the root moved document → shadow root: the old registration is detached
    // by identity and the new one created — the re-subscription proof
    expect(docLog.removes()).toHaveLength(1)
    expect(docLog.removes()[0]).toBe(docLog.adds()[0])
    expect(shadowLog.adds()).toHaveLength(1)

    // the new root is live on the shadow root: a click inside the shadow tree
    // does not fire …
    fire(inner, 'click')
    expect(handler).not.toHaveBeenCalled()

    // … and with the listener inside the shadow tree, nothing dispatched
    // outside it can reach the handler any more — not even the previous
    // target's own clicks
    fire(container, 'click')
    fire(document.body, 'click')
    expect(handler).not.toHaveBeenCalled()

    host.remove()
  })

  it('binds the shadow root when every target lives inside one', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = document.createElement('div')
    shadow.appendChild(inner)

    const handler = vi.fn()
    const shadowLog = spyOn(shadow as unknown as EventTarget, 'click')
    const docLog = spyOn(document, 'click')
    await renderHook(() => useClickAway({ current: inner }, handler))

    // bound on the shadow root, never on `document`
    expect(shadowLog.adds()).toHaveLength(1)
    expect(docLog.adds()).toHaveLength(0)

    // The listener root is a *separate event tree* (upstream
    // `getDocumentOrShadow`): a click inside the shadow does not fire, and
    // because the composed path retargets at the host, a `document.body` click
    // can never reach a listener bound inside the shadow root either. That is
    // upstream's behaviour, kept faithfully rather than "fixed" here.
    fire(inner, 'click')
    expect(handler).not.toHaveBeenCalled()

    fire(document.body, 'click')
    expect(handler).not.toHaveBeenCalled()

    host.remove()
  })
})
