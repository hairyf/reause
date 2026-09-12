import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useClickAway } from '../useClickAway'

/**
 * Mirrors upstream's `__tests__/index.spec.ts`
 * (`source/ahooks/packages/hooks/src/useClickAway/__tests__/index.spec.ts`),
 * extended with the behaviours this port is contracted on: the shadow-DOM
 * listener root, single/array `eventName` symmetry, the missing-target branch,
 * the `useLatest` handler, and re-subscription when the resolved target moves.
 *
 * Upstream attaches to the document (or the shadow root); the reause port binds
 * through `useEventListener`, whose target is that same document / shadow root.
 * The subscription is spied where it binds, so add/remove symmetry is measured
 * on real calls rather than inferred.
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

  it('fires on an outside click and ignores a click inside the target', async () => {
    let state = 0
    const log = spyOn(document, 'click')
    await renderHook(() => useClickAway(container, () => {
      state++
    }))

    expect(log.adds()).toHaveLength(1)

    fire(container, 'click')
    expect(state).toBe(0)

    fire(document.body, 'click')
    expect(state).toBe(1)
  })

  it('accepts a ref-like target', async () => {
    let state = 0
    await renderHook(() => useClickAway({ current: container }, () => {
      state++
    }))

    fire(container, 'click')
    expect(state).toBe(0)

    fire(document.body, 'click')
    expect(state).toBe(1)
  })

  it('accepts a form control as the target, which `toValue` must not unwrap', async () => {
    // `<input>` / `<select>` / `<textarea>` carry a `value` property. The shared
    // `toValue` guards for that (`!('addEventListener' in value)`), so the
    // element survives resolution instead of collapsing to its string value —
    // this pins that guard for this hook.
    const input = document.createElement('input')
    input.value = 'typed'
    document.body.appendChild(input)

    let state = 0
    await renderHook(() => useClickAway(input, () => {
      state++
    }))

    fire(input, 'click')
    expect(state).toBe(0)

    fire(document.body, 'click')
    expect(state).toBe(1)

    input.remove()
  })

  it('treats a click inside any target of an array as inside', async () => {
    let state = 0
    await renderHook(() => useClickAway([container, container1], () => {
      state++
    }))

    fire(container, 'click')
    expect(state).toBe(0)

    fire(container1, 'click')
    expect(state).toBe(0)

    fire(document.body, 'click')
    expect(state).toBe(1)
  })

  it('accepts a single eventName', async () => {
    let state = 0
    const mousedown = spyOn(document, 'mousedown')
    const click = spyOn(document, 'click')
    await renderHook(() => useClickAway(container, () => {
      state++
    }, 'mousedown'))

    expect(mousedown.adds()).toHaveLength(1)
    expect(click.adds()).toHaveLength(0)

    fire(container, 'mousedown')
    expect(state).toBe(0)

    // `click` was never registered, so it cannot reach the handler
    fire(document.body, 'click')
    expect(state).toBe(0)

    fire(document.body, 'mousedown')
    expect(state).toBe(1)
  })

  it('accepts an array of eventNames, registers each one and removes each one', async () => {
    let state = 0
    const mousedown = spyOn(document, 'mousedown')
    const touchstart = spyOn(document, 'touchstart')
    const click = spyOn(document, 'click')
    const { unmount } = await renderHook(() => useClickAway(container, () => {
      state++
    }, ['mousedown', 'touchstart']))

    expect(mousedown.adds()).toHaveLength(1)
    expect(touchstart.adds()).toHaveLength(1)
    expect(click.adds()).toHaveLength(0)

    fire(document.body, 'mousedown')
    expect(state).toBe(1)

    fire(document.body, 'touchstart')
    expect(state).toBe(2)

    // inside the target neither event fires
    fire(container, 'mousedown')
    fire(container, 'touchstart')
    expect(state).toBe(2)

    unmount()

    // per-event add/remove symmetry, matched by listener identity
    expect(mousedown.removes()).toHaveLength(1)
    expect(mousedown.removes()[0]).toBe(mousedown.adds()[0])
    expect(touchstart.removes()).toHaveLength(1)
    expect(touchstart.removes()[0]).toBe(touchstart.adds()[0])

    fire(document.body, 'mousedown')
    fire(document.body, 'touchstart')
    expect(state).toBe(2)
  })

  it('treats a missing / never-attached target as outside', async () => {
    let state = 0
    const { rerender } = await renderHook(
      // the annotation widens the prop beyond the `null` default; the cast on
      // `initialProps` keeps `rerender` on that same widened prop type
      ({ element }: { element: HTMLDivElement | null } = { element: null }) =>
        useClickAway(element, () => {
          state++
        }),
      { initialProps: { element: null } as { element: HTMLDivElement | null } },
    )

    // no target yet — every click is outside, including one on an element that
    // would be "inside" if the target had resolved
    fire(container, 'click')
    expect(state).toBe(1)

    fire(document.body, 'click')
    expect(state).toBe(2)

    // once the target resolves, its own subtree is inside again
    await rerender({ element: container })
    fire(container, 'click')
    expect(state).toBe(2)

    fire(document.body, 'click')
    expect(state).toBe(3)
  })

  it('reads the handler through useLatest: a new inline arrow does not re-register, yet the newest handler runs', async () => {
    let state = 0
    const log = spyOn(document, 'click')
    const { rerender } = await renderHook(({ by }: { by: number } = { by: 1 }) =>
      useClickAway(container, () => {
        state += by
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
    expect(state).toBe(3)

    fire(container, 'click')
    expect(state).toBe(3)
  })

  it('re-reads the target when it changes, even though the `document` root stays the same', async () => {
    let state = 0
    const log = spyOn(document, 'click')
    const { rerender } = await renderHook(
      ({ element }: { element: HTMLDivElement } = { element: container }) =>
        useClickAway(element, () => {
          state++
        }),
      { initialProps: { element: container } },
    )

    expect(log.adds()).toHaveLength(1)

    fire(container, 'click')
    fire(document.body, 'click')
    expect(state).toBe(1)

    await rerender({ element: container1 })

    // the listener root is `document` before and after, so the subscription is
    // deliberately kept (upstream re-runs its effect, reause re-binds only on a
    // real root change) — 1 add, 0 removes
    expect(log.adds()).toHaveLength(1)
    expect(log.removes()).toHaveLength(0)

    // …yet the *new* element is the one that swallows clicks now, and the old
    // one is outside again: the target is read through a ref, never closed over
    fire(container1, 'click')
    expect(state).toBe(1)

    fire(container, 'click')
    expect(state).toBe(2)

    fire(document.body, 'click')
    expect(state).toBe(3)
  })

  it('moves the listener when the target changes root, removing the old registration', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = document.createElement('div')
    shadow.appendChild(inner)

    let state = 0
    const docLog = spyOn(document, 'click')
    const shadowLog = spyOn(shadow as unknown as EventTarget, 'click')
    const { rerender } = await renderHook(
      ({ element }: { element: HTMLDivElement } = { element: container }) =>
        useClickAway(element, () => {
          state++
        }),
      { initialProps: { element: container } },
    )

    expect(docLog.adds()).toHaveLength(1)
    expect(shadowLog.adds()).toHaveLength(0)

    await rerender({ element: inner })

    // the root moved document → shadow root: the old registration is detached
    // by identity and the new one created — the re-subscription proof
    expect(docLog.removes()).toHaveLength(1)
    expect(docLog.removes()[0]).toBe(docLog.adds()[0])
    expect(shadowLog.adds()).toHaveLength(1)

    // the new root is live on the shadow root: a click inside the shadow tree
    // does not fire …
    fire(inner, 'click')
    expect(state).toBe(0)

    // … and with the listener inside the shadow tree, nothing dispatched
    // outside it can reach the handler any more — not even the previous
    // target's own clicks
    fire(container, 'click')
    fire(document.body, 'click')
    expect(state).toBe(0)

    host.remove()
  })

  it('binds the shadow root when every target lives inside one', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = document.createElement('div')
    shadow.appendChild(inner)

    let state = 0
    const shadowLog = spyOn(shadow as unknown as EventTarget, 'click')
    const docLog = spyOn(document, 'click')
    await renderHook(() => useClickAway(inner, () => {
      state++
    }))

    // bound on the shadow root, never on `document`
    expect(shadowLog.adds()).toHaveLength(1)
    expect(docLog.adds()).toHaveLength(0)

    // The listener root is a *separate event tree* (upstream
    // `getDocumentOrShadow`): a click inside the shadow does not fire, and
    // because the composed path retargets at the host, a `document.body` click
    // can never reach a listener bound inside the shadow root either. That is
    // upstream's behaviour, kept faithfully rather than "fixed" here.
    fire(inner, 'click')
    expect(state).toBe(0)

    fire(document.body, 'click')
    expect(state).toBe(0)

    host.remove()
  })
})
