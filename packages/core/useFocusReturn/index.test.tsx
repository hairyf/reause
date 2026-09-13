import type { UseFocusReturnInput } from '../useFocusReturn'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useFocusReturn } from '../useFocusReturn'

/**
 * Author-written suite: the pinned `@mantine/hooks` `use-focus-return`
 * directory ships no test file, so nothing here mirrors upstream tests — the
 * cases below pin the behaviours the implementation is *for* (the 10 ms
 * deferred restore, the snapshot/guard chain, the `Tab` cancellation, the
 * cleanup), which a naive `useEffect` + `focus()` rewrite would silently lose.
 *
 * Real timers are faked for the whole suite because the restore is a
 * `setTimeout(…, 10)`: time is advanced deliberately (`9` then `1`, or the full
 * `10`) so each assertion is tied to the timer actually firing rather than to
 * an arbitrary sleep. Every "no restore" case is paired with the observable
 * state it would have changed, and the `Tab` case is paired with an identical
 * close that *does* restore, so neither can pass for the wrong reason.
 */
describe('useFocusReturn', () => {
  let trigger: HTMLButtonElement
  let overlayInput: HTMLInputElement
  let other: HTMLButtonElement
  let triggerFocus: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()

    trigger = document.createElement('button')
    trigger.textContent = 'open overlay'
    overlayInput = document.createElement('input')
    other = document.createElement('button')
    document.body.append(trigger, overlayInput, other)

    // `focus` is what `returnFocus()` calls, so the spy distinguishes "the
    // restore ran and focused the same element again" from "the restore never
    // ran" — an assertion `document.activeElement` alone cannot make.
    triggerFocus = vi.spyOn(trigger, 'focus')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    trigger.remove()
    overlayInput.remove()
    other.remove()
  })

  it('should return a function, not a tuple', async () => {
    const { result } = await renderHook(() => useFocusReturn({ opened: false }))

    expect(result.current).toBeTypeOf('function')
    expect(Array.isArray(result.current)).toBe(false)
    expectTypeOf(result.current).toEqualTypeOf<() => void>()
    expectTypeOf(useFocusReturn).returns.toEqualTypeOf<() => void>()
    expectTypeOf(useFocusReturn).parameter(0).toEqualTypeOf<UseFocusReturnInput>()
  })

  it('should restore focus to the previously active element 10 ms after `opened` flips false', async () => {
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { rerender, act, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: false } },
    )

    // opening snapshots the element that was active *before* the overlay
    await rerender({ opened: true })
    // the overlay takes focus while open — the snapshot must survive that
    overlayInput.focus()
    expect(document.activeElement).toBe(overlayInput)

    // the overlay input is still focused when the close is rendered, so this is
    // the "active element unchanged" arm of the guard chain
    await rerender({ opened: false })

    // nothing is restored before the 10 ms window elapses
    expect(document.activeElement).toBe(overlayInput)
    await act(() => {
      vi.advanceTimersByTime(9)
    })
    expect(document.activeElement).toBe(overlayInput)

    // …and exactly at 10 ms the snapshot is restored
    await act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(document.activeElement).toBe(trigger)
    // the restore uses `{ preventScroll: true }`, so it never scrolls the page
    expect(triggerFocus).toHaveBeenCalledWith({ preventScroll: true })

    await unmount()
  })

  it('should restore focus when the element focused while open is gone by the time the timer fires', async () => {
    trigger.focus()

    const { rerender, act, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: false } },
    )

    await rerender({ opened: true })
    overlayInput.focus()

    // the overlay unmounts on close, so focus falls back to `document.body`
    overlayInput.remove()
    expect(document.activeElement).toBe(document.body)

    await rerender({ opened: false })
    await act(() => {
      vi.advanceTimersByTime(10)
    })

    // `document.body` passes the guard chain, so the snapshot is restored
    expect(document.activeElement).toBe(trigger)

    await unmount()
  })

  it('should not pull focus back when another element claimed it after the close', async () => {
    trigger.focus()
    triggerFocus.mockClear()

    const { rerender, act, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: false } },
    )

    await rerender({ opened: true })
    await rerender({ opened: false })

    // during the closing transition the user (or an autofocus) moves focus
    // deliberately: that new target wins over the snapshot
    other.focus()
    expect(document.activeElement).toBe(other)

    await act(() => {
      vi.advanceTimersByTime(10)
    })

    expect(document.activeElement).toBe(other)
    expect(triggerFocus).not.toHaveBeenCalled()

    await unmount()
  })

  it('should not chase focus back to document.body when nothing was focused at open time', async () => {
    trigger.focus()
    trigger.blur()
    triggerFocus.mockClear()
    expect(document.activeElement).toBe(document.body)

    const { rerender, act, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: false } },
    )

    // nothing was focused, so `document.body` — not the trigger — is snapshotted
    await rerender({ opened: true })
    overlayInput.focus()
    overlayInput.remove()
    expect(document.activeElement).toBe(document.body)

    await rerender({ opened: false })
    await act(() => {
      vi.advanceTimersByTime(10)
    })

    // restoring to `document.body` is not a restore to a real target: focus
    // stays where it was instead of jumping back to the trigger
    expect(document.activeElement).toBe(document.body)
    expect(triggerFocus).not.toHaveBeenCalled()

    await unmount()
  })

  it('should not restore when no element was ever captured (the snapshot stays null)', async () => {
    trigger.focus()
    triggerFocus.mockClear()

    // mounted already open: `useUpdateEffect` skips the mount, so the open
    // branch never runs and no snapshot is taken
    const { rerender, act, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: true } },
    )

    overlayInput.focus()

    await rerender({ opened: false })
    await act(() => {
      vi.advanceTimersByTime(10)
    })

    // the guard chain passes, but `returnFocus()` has nothing to return to and
    // bails out — the active element is untouched and `focus` is never called
    expect(document.activeElement).toBe(overlayInput)
    expect(triggerFocus).not.toHaveBeenCalled()

    await unmount()
  })

  it('should let a user who presses Tab keep their own focus target', async () => {
    trigger.focus()
    triggerFocus.mockClear()

    const { rerender, act, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: false } },
    )

    await rerender({ opened: true })
    overlayInput.focus()
    overlayInput.remove()
    expect(document.activeElement).toBe(document.body)

    await rerender({ opened: false })
    // `Tab` during the closing transition clears the pending timeout
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))

    await act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(document.activeElement).toBe(document.body)
    expect(triggerFocus).not.toHaveBeenCalled()

    // control: the identical close without the `Tab` press does restore, so the
    // assertion above is about the cancellation rather than a broken setup
    document.body.append(overlayInput)
    trigger.focus()
    await rerender({ opened: true })
    overlayInput.focus()
    overlayInput.remove()
    await rerender({ opened: false })
    await act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(document.activeElement).toBe(trigger)

    await unmount()
  })

  it('should ignore keys other than Tab when arming the restore', async () => {
    trigger.focus()

    const { rerender, act, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: false } },
    )

    await rerender({ opened: true })
    overlayInput.focus()
    overlayInput.remove()

    await rerender({ opened: false })
    // only `Tab` cancels the restore — any other key leaves the timer alone
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(document.activeElement).toBe(trigger)

    await unmount()
  })

  it('should not restore when `shouldReturnFocus` is false', async () => {
    trigger.focus()
    triggerFocus.mockClear()

    // `initialProps` carries the interface type so `rerender` accepts a partial
    // update (`{ opened: true }`) without the optional option becoming required
    const initialProps: UseFocusReturnInput = { opened: false, shouldReturnFocus: true }
    const { rerender, act, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps },
    )

    await rerender({ opened: true })
    overlayInput.focus()
    overlayInput.remove()
    expect(document.activeElement).toBe(document.body)

    await rerender({ opened: false, shouldReturnFocus: false })
    await act(() => {
      vi.advanceTimersByTime(10)
    })

    // no timeout is armed at all, so nothing changes on the close
    expect(document.activeElement).toBe(document.body)
    expect(triggerFocus).not.toHaveBeenCalled()

    await unmount()
  })

  it('should restore focus when the returned function is called manually', async () => {
    trigger.focus()

    const { result, rerender, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: false } },
    )

    await rerender({ opened: true })
    overlayInput.focus()
    expect(document.activeElement).toBe(overlayInput)

    // manual restore is synchronous — no timer is involved
    result.current()
    expect(document.activeElement).toBe(trigger)

    await unmount()
  })

  it('should clear the pending restore and the keydown listener on unmount', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    trigger.focus()
    triggerFocus.mockClear()

    const { rerender, unmount } = await renderHook(
      (props: UseFocusReturnInput = { opened: false }) => useFocusReturn(props),
      { initialProps: { opened: false } },
    )

    await rerender({ opened: true })
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    overlayInput.focus()
    overlayInput.remove()
    await rerender({ opened: false })

    await unmount()

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    // the listener is gone and the timeout was cleared, so neither the key nor
    // the elapsed time can move focus after unmount
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    vi.advanceTimersByTime(10)
    expect(document.activeElement).toBe(document.body)
    expect(triggerFocus).not.toHaveBeenCalled()
  })
})
