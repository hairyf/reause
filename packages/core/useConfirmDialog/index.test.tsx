import { useListener } from '@reause/shared'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useConfirmDialog } from '../useConfirmDialog'

describe('useConfirmDialog', () => {
  it('should be defined', () => {
    expect(useConfirmDialog).toBeDefined()
  })

  it('should open the dialog and close on confirm', async () => {
    const show = { current: false }

    const { result, act } = await renderHook(() => useConfirmDialog(show))

    await act(async () => {
      result.current.reveal()
    })
    expect(show.current).toBe(true)
    expect(result.current.isRevealed).toBe(true)

    await act(async () => {
      result.current.confirm()
    })
    expect(show.current).toBe(false)
    expect(result.current.isRevealed).toBe(false)
  })

  it('mirrors an out-of-band external `revealed` write into `isRevealed` on the next render', async () => {
    const show = { current: false }

    const { result, act, rerender } = await renderHook(() => useConfirmDialog(show))

    await act(async () => {
      result.current.reveal()
    })
    expect(result.current.isRevealed).toBe(true)

    // external write — e.g. the modal was closed outside the controls
    show.current = false

    await act(async () => {
      await rerender()
    })
    expect(result.current.isRevealed).toBe(false)

    // and the other direction
    show.current = true

    await act(async () => {
      await rerender()
    })
    expect(result.current.isRevealed).toBe(true)
  })

  it('should close on cancel', async () => {
    const show = { current: false }

    const { result, act } = await renderHook(() => useConfirmDialog(show))

    await act(async () => {
      result.current.reveal()
    })
    expect(show.current).toBe(true)

    await act(async () => {
      result.current.cancel()
    })
    expect(show.current).toBe(false)
  })

  it('should execute `onReveal` fn on open dialog', async () => {
    const show = { current: false }
    const message = { current: 'initial' }

    const { result, act } = await renderHook(() => useConfirmDialog(show))
    expect(message.current).toBe('initial')

    result.current.onReveal(() => {
      message.current = 'final'
    })

    await act(async () => {
      result.current.reveal()
    })
    expect(message.current).toBe('final')

    await act(async () => {
      result.current.cancel()
    })
    expect(show.current).toBe(false)
  })

  it('should execute a callback inside `onConfirm` hook only after confirming', async () => {
    const show = { current: false }
    const message = { current: 'initial' }

    const { result, act } = await renderHook(() => useConfirmDialog(show))

    result.current.onConfirm(() => {
      message.current = 'final'
    })
    expect(message.current).toBe('initial')

    await act(async () => {
      result.current.reveal()
    })
    expect(message.current).toBe('initial')

    await act(async () => {
      result.current.confirm()
    })
    expect(message.current).toBe('final')
  })

  it('should execute a callback inside `onCancel` hook only after canceling dialog', async () => {
    const show = { current: false }
    const message = { current: 'initial' }

    const { result, act } = await renderHook(() => useConfirmDialog(show))

    result.current.onCancel(() => {
      message.current = 'final'
    })
    expect(message.current).toBe('initial')

    await act(async () => {
      result.current.reveal()
    })
    expect(message.current).toBe('initial')

    await act(async () => {
      result.current.cancel()
    })
    expect(message.current).toBe('final')
  })

  it('should pass data from confirm fn to `onConfirm` hook', async () => {
    const message = { current: 'initial' }
    const show = { current: false }
    const data = { value: 'confirm' }

    const { result, act } = await renderHook(() => useConfirmDialog(show))

    result.current.onConfirm((data) => {
      message.current = data.value
    })

    await act(async () => {
      result.current.reveal()
    })
    await act(async () => {
      result.current.confirm(data)
    })

    expect(message.current).toBe('confirm')
  })

  it('should pass data from cancel fn to `onCancel` hook', async () => {
    const message = { current: 'initial' }
    const show = { current: false }
    const data = { value: 'confirm' }

    const { result, act } = await renderHook(() => useConfirmDialog(show))

    result.current.onCancel((data) => {
      message.current = data.value
    })

    await act(async () => {
      result.current.reveal()
    })
    await act(async () => {
      result.current.cancel(data)
    })

    expect(message.current).toBe('confirm')
  })

  it('should return promise that will be resolved on `confirm()`', async () => {
    const show = { current: false }

    const { result, act } = await renderHook(() => useConfirmDialog(show))

    let promise!: ReturnType<typeof result.current.reveal>
    await act(async () => {
      promise = result.current.reveal()
    })
    expect(result.current.isRevealed).toBe(true)

    await act(async () => {
      result.current.confirm(true)
    })

    const { data, isCanceled } = await promise
    expect(data).toBe(true)
    expect(isCanceled).toBe(false)
  })

  it('should return promise that will be resolved on `cancel()`', async () => {
    const show = { current: false }

    const { result, act } = await renderHook(() => useConfirmDialog(show))

    let promise!: ReturnType<typeof result.current.reveal>
    await act(async () => {
      promise = result.current.reveal()
    })

    await act(async () => {
      result.current.cancel(true)
    })

    const { data, isCanceled } = await promise
    expect(data).toBe(true)
    expect(isCanceled).toBe(true)
  })

  it('the returned `off` function unsubscribes the listener', async () => {
    const calls = vi.fn()

    const { result, act } = await renderHook(() => useConfirmDialog())

    const off = result.current.onConfirm(() => {
      calls()
    })

    await act(async () => {
      result.current.reveal()
    })
    await act(async () => {
      result.current.confirm()
    })
    expect(calls).toHaveBeenCalledTimes(1)

    off()

    await act(async () => {
      result.current.reveal()
    })
    await act(async () => {
      result.current.confirm()
    })
    expect(calls).toHaveBeenCalledTimes(1)
  })

  it('useListener(onConfirm, cb) fires on confirm and stops after unmount', async () => {
    const calls = vi.fn()

    const { result, act, unmount } = await renderHook(() => {
      const dialog = useConfirmDialog()
      useListener(dialog.onConfirm, () => {
        calls()
      })
      return dialog
    })

    await act(async () => {
      result.current.reveal()
    })
    await act(async () => {
      result.current.confirm()
    })
    expect(calls).toHaveBeenCalledTimes(1)

    unmount()
    result.current.confirm()
    expect(calls).toHaveBeenCalledTimes(1)
  })

  it('useListener(onCancel, cb) fires on cancel and stops after unmount', async () => {
    const calls = vi.fn()

    const { result, act, unmount } = await renderHook(() => {
      const dialog = useConfirmDialog()
      useListener(dialog.onCancel, () => {
        calls()
      })
      return dialog
    })

    await act(async () => {
      result.current.reveal()
    })
    await act(async () => {
      result.current.cancel()
    })
    expect(calls).toHaveBeenCalledTimes(1)

    unmount()
    result.current.cancel()
    expect(calls).toHaveBeenCalledTimes(1)
  })

  it('collects listener return values with `Promise.all` (upstream trigger parity)', async () => {
    // a thenable whose `then` is only called if the hook collects the return
    // value through `Promise.all`, as upstream `createEventHook().trigger()` does
    const then = vi.fn()
    const thenable = {
      then: (resolve: () => void) => {
        then()
        resolve()
      },
    }

    const { result, act } = await renderHook(() => useConfirmDialog())

    result.current.onConfirm(() => thenable)

    await act(async () => {
      result.current.reveal()
    })
    await act(async () => {
      result.current.confirm()
    })

    await vi.waitFor(() => expect(then).toHaveBeenCalledTimes(1))
  })

  it('propagates a synchronous listener error to the caller (upstream parity)', async () => {
    const { result } = await renderHook(() => useConfirmDialog())

    result.current.onReveal(() => {
      throw new Error('listener boom')
    })

    expect(() => result.current.reveal()).toThrowError('listener boom')
  })
})
