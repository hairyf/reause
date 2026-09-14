import { useListener } from '@reause/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useDropZone } from '../useDropZone'

function createDropZone(): HTMLDivElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function dragEvent(type: 'dragenter' | 'dragover' | 'dragleave' | 'drop', dataTransfer?: DataTransfer) {
  return new DragEvent(type, { dataTransfer, bubbles: true })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useDropZone', () => {
  it('should be defined', () => {
    expect(useDropZone).toBeDefined()
  })

  it('should initialize isOverDropZone as false', async () => {
    const { result } = await renderHook(() => useDropZone({ current: null }))

    expect(result.current.isOverDropZone).toBe(false)
    expect(result.current.files).toBeNull()
    expect(typeof result.current.onDrop).toBe('function')
    expect(typeof result.current.onDragEnter).toBe('function')
    expect(typeof result.current.onDragLeave).toBe('function')
  })

  it('should set isOverDropZone true on dragenter and false on dragleave', async () => {
    const el = createDropZone()
    const { result, act } = await renderHook(() => useDropZone({ current: el }))

    expect(result.current.isOverDropZone).toBe(false)

    await act(() => {
      el.dispatchEvent(dragEvent('dragenter', new DataTransfer()))
    })
    expect(result.current.isOverDropZone).toBe(true)

    await act(() => {
      el.dispatchEvent(dragEvent('dragleave', new DataTransfer()))
    })
    expect(result.current.isOverDropZone).toBe(false)
  })

  it('should call onDrop option with the dropped files and reset isOverDropZone', async () => {
    const el = createDropZone()
    const file = new File(['content'], 'file.txt', { type: 'text/plain' })
    const onDrop = vi.fn()

    const { result, act } = await renderHook(() => useDropZone({ current: el }, { onDrop }))

    const dt = new DataTransfer()
    dt.items.add(file)

    await act(() => {
      el.dispatchEvent(dragEvent('dragenter', new DataTransfer()))
    })
    expect(result.current.isOverDropZone).toBe(true)

    await act(() => {
      el.dispatchEvent(dragEvent('drop', dt))
    })

    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDrop.mock.calls[0][0]).toEqual([file])
    expect(result.current.isOverDropZone).toBe(false)
  })

  it('should expose the dropped files via the return value', async () => {
    const el = createDropZone()
    const file = new File(['content'], 'file.txt', { type: 'text/plain' })

    const { result, act } = await renderHook(() => useDropZone({ current: el }))

    expect(result.current.files).toBeNull()

    const dt = new DataTransfer()
    dt.items.add(file)

    await act(() => {
      el.dispatchEvent(dragEvent('drop', dt))
    })

    expect(result.current.files).toEqual([file])
  })

  it('should accept the onDrop shorthand and call it on drop', async () => {
    const el = createDropZone()
    const file = new File(['content'], 'file.txt', { type: 'text/plain' })
    const onDrop = vi.fn()

    const { act } = await renderHook(() => useDropZone({ current: el }, onDrop))

    const dt = new DataTransfer()
    dt.items.add(file)

    await act(() => {
      el.dispatchEvent(dragEvent('drop', dt))
    })

    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDrop.mock.calls[0][0]).toEqual([file])
  })

  it('should keep isOverDropZone false when the data types are not allowed', async () => {
    const el = createDropZone()
    const { result, act } = await renderHook(() => useDropZone({ current: el }, { dataTypes: ['image/png'] }))

    const dt = new DataTransfer()
    dt.items.add(new File(['x'], 'file.txt', { type: 'text/plain' }))

    await act(() => {
      el.dispatchEvent(dragEvent('dragenter', dt))
    })

    // Upstream (and this port) skip the "invalid drag" early return on
    // Safari/WebKit (`isSafari()` in the hook) because WebKit cannot inspect
    // `DataTransferItem` types during a drag, so the zone stays highlighted
    // there; the drop itself is still rejected below. Playwright's WebKit
    // reports itself as Safari (`... AppleWebKit ... Safari/...`, no `chrome`
    // global), so the expectation is engine-conditional.
    const skipsTypeCheckDuringDrag = /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent)
      && !('chrome' in window)
    expect(result.current.isOverDropZone).toBe(skipsTypeCheckDuringDrag)

    await act(() => {
      el.dispatchEvent(dragEvent('drop', dt))
    })
    expect(result.current.isOverDropZone).toBe(false)
  })

  it('should respect the checkValidity option with precedence over dataTypes', async () => {
    const el = createDropZone()
    const checkValidity = vi.fn(() => true)
    const onDrop = vi.fn()

    const { act } = await renderHook(() => useDropZone({ current: el }, { dataTypes: ['image/png'], checkValidity, onDrop }))

    const dt = new DataTransfer()
    dt.items.add(new File(['x'], 'file.txt', { type: 'text/plain' }))

    await act(() => {
      el.dispatchEvent(dragEvent('drop', dt))
    })

    expect(checkValidity).toHaveBeenCalledTimes(1)
    expect(onDrop).toHaveBeenCalledTimes(1)
  })

  it('useListener(onDrop, cb) fires on drop and unsubscribes on unmount', async () => {
    const el = createDropZone()
    const file = new File(['content'], 'file.txt', { type: 'text/plain' })
    const calls: Array<File[] | null> = []

    const { unmount, act } = await renderHook(() => {
      const dropZone = useDropZone({ current: el })
      useListener(dropZone.onDrop, (files) => {
        calls.push(files)
      })
      return dropZone
    })

    const dt = new DataTransfer()
    dt.items.add(file)

    await act(() => {
      el.dispatchEvent(dragEvent('drop', dt))
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual([file])

    // after unmount the listeners are detached and no longer fire
    unmount()
    await act(() => {
      el.dispatchEvent(dragEvent('drop', dt))
    })
    expect(calls).toHaveLength(1)
  })

  it('should fire onDragEnter / onDragLeave listeners and the returned off function unsubscribes', async () => {
    const el = createDropZone()
    const enter = vi.fn()
    const leave = vi.fn()

    const { result, act } = await renderHook(() => useDropZone({ current: el }))

    const enterHandle = result.current.onDragEnter(enter)
    const leaveHandle = result.current.onDragLeave(leave)

    await act(() => {
      el.dispatchEvent(dragEvent('dragenter', new DataTransfer()))
    })
    expect(enter).toHaveBeenCalledTimes(1)
    expect(leave).not.toHaveBeenCalled()

    enterHandle()
    await act(() => {
      el.dispatchEvent(dragEvent('dragenter', new DataTransfer()))
    })
    expect(enter).toHaveBeenCalledTimes(1)

    await act(() => {
      el.dispatchEvent(dragEvent('dragleave', new DataTransfer()))
    })
    expect(leave).toHaveBeenCalledTimes(1)
    leaveHandle()
  })

  it('should re-bind listeners when the resolved target changes', async () => {
    const el1 = document.createElement('div')
    const target: { current: HTMLDivElement | null } = { current: el1 }

    const { result, rerender, act } = await renderHook(() => useDropZone(target))

    await act(() => {
      el1.dispatchEvent(dragEvent('dragenter', new DataTransfer()))
    })
    expect(result.current.isOverDropZone).toBe(true)
    await act(() => {
      el1.dispatchEvent(dragEvent('dragleave', new DataTransfer()))
    })
    expect(result.current.isOverDropZone).toBe(false)

    const el2 = document.createElement('div')
    target.current = el2
    await rerender()

    // the old target is no longer wired
    await act(() => {
      el1.dispatchEvent(dragEvent('dragenter', new DataTransfer()))
    })
    expect(result.current.isOverDropZone).toBe(false)

    // the new target is wired
    await act(() => {
      el2.dispatchEvent(dragEvent('dragenter', new DataTransfer()))
    })
    expect(result.current.isOverDropZone).toBe(true)
    await act(() => {
      el2.dispatchEvent(dragEvent('dragleave', new DataTransfer()))
    })
    expect(result.current.isOverDropZone).toBe(false)
  })

  it('is SSR-safe — render-time snapshot stays false and no listener attaches during render', async () => {
    const el = document.createElement('div')
    const snapshots: boolean[] = []
    let captured = false

    function Probe() {
      const { isOverDropZone } = useDropZone({ current: el })
      if (!captured) {
        snapshots.push(isOverDropZone)
        captured = true
      }
      return <div />
    }

    await render(<Probe />)

    // during render (e.g. on the server) the value is the default and nothing
    // has touched the DOM yet — listeners only attach in the mount effect
    expect(snapshots[0]).toBe(false)
  })
})
