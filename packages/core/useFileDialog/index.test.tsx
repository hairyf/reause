import { useListener } from '@reause/shared'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useFileDialog } from '../useFileDialog'

describe('useFileDialog', () => {
  const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
  const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' })

  it('should be defined', () => {
    expect(useFileDialog).toBeDefined()
  })

  it('should initialize with initialFiles as FileList', async () => {
    const dt = new DataTransfer()
    dt.items.add(file1)
    dt.items.add(file2)

    const { result } = await renderHook(() => useFileDialog({ initialFiles: dt.files }))

    expect(result.current.files).toBe(dt.files)
  })

  it('should initialize with initialFiles as Array<File>', async () => {
    const { result } = await renderHook(() => useFileDialog({ initialFiles: [file1, file2] }))

    expect(result.current.files).not.toBeNull()
    const selected = Array.from(result.current.files!)
    expect(selected).toHaveLength(2)
    expect(selected[0]).toBe(file1)
    expect(selected[1]).toBe(file2)
  })

  it('should initialize with initialFiles as null', async () => {
    const { result } = await renderHook(() => useFileDialog())

    expect(result.current.files).toBeNull()
  })

  it('should reset files when reset option is true', async () => {
    const input = document.createElement('input')
    input.click = vi.fn()

    const { result } = await renderHook(() => useFileDialog({ input: { current: input }, initialFiles: [file1], reset: true }))

    result.current.open()
    await expect.poll(() => result.current.files).toBeNull()
    expect(input.click).toHaveBeenCalled()
  })

  it('should work with custom input element', async () => {
    const input = document.createElement('input')
    input.click = vi.fn()

    const { result } = await renderHook(() => useFileDialog({ input: { current: input } }))

    result.current.open()
    expect(input.type).toBe('file')
    expect(input.click).toHaveBeenCalled()
  })

  it('should work with input element passed as a ref-like object', async () => {
    const inputEl1 = document.createElement('input')
    inputEl1.click = vi.fn()
    const inputSource = { current: inputEl1 }

    const { result, rerender } = await renderHook(() => useFileDialog({ input: inputSource }))

    await expect.poll(() => inputEl1.type).toBe('file')
    expect(inputEl1.click).toHaveBeenCalledTimes(0)

    result.current.open()
    expect(inputEl1.click).toHaveBeenCalledTimes(1)

    const inputEl2 = document.createElement('input')
    inputEl2.click = vi.fn()
    inputSource.current = inputEl2
    await rerender()

    await expect.poll(() => inputEl2.type).toBe('file')
    expect(inputEl2.click).toHaveBeenCalledTimes(0)

    result.current.open()
    expect(inputEl2.click).toHaveBeenCalledTimes(1)
  })

  it('should re-apply option attributes when the input ref is swapped', async () => {
    const inputSource: { current: HTMLInputElement | null } = { current: null }

    const { rerender } = await renderHook(() => useFileDialog({ input: inputSource, multiple: false }))

    const inputEl = document.createElement('input')
    inputEl.click = vi.fn()
    inputSource.current = inputEl
    await rerender()

    // the attributes follow the newly wired input without calling open()
    await expect.poll(() => inputEl.type).toBe('file')
    expect(inputEl.multiple).toBe(false)
  })

  it('should trigger onchange and update files when file is selected', async () => {
    const input = document.createElement('input')
    input.click = vi.fn()
    const file = new File(['dummy content'], 'example.txt', { type: 'text/plain' })

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true,
    })

    const { result } = await renderHook(() => useFileDialog({ input: { current: input } }))

    const changeHandler = vi.fn()
    result.current.onChange(changeHandler)

    result.current.open()

    input.dispatchEvent(new Event('change'))

    expect(changeHandler).toHaveBeenCalledTimes(1)
    const calledWith = changeHandler.mock.calls[0][0]
    expect(calledWith).toBeTruthy()
    expect(calledWith[0]).toEqual(file)

    await expect.poll(() => result.current.files).toBe(calledWith)
  })

  it('should work with a plain value for the multiple option', async () => {
    const input = document.createElement('input')
    input.click = vi.fn()
    const inputRef = { current: input }
    let multiple = true

    const { result, rerender } = await renderHook(() => useFileDialog({ input: inputRef, multiple }))

    await expect.poll(() => input.multiple).toBe(true)
    result.current.open()
    expect(input.multiple).toBe(true)

    multiple = false
    await rerender()
    await expect.poll(() => input.multiple).toBe(false)
    result.current.open()
    expect(input.multiple).toBe(false)
  })

  it('should work with a plain value for the accept option', async () => {
    const input = document.createElement('input')
    input.click = vi.fn()
    const inputRef = { current: input }
    let accept = 'image/*'

    const { result, rerender } = await renderHook(() => useFileDialog({ input: inputRef, accept }))

    await expect.poll(() => input.accept).toBe('image/*')
    result.current.open()
    expect(input.accept).toBe('image/*')

    accept = 'video/*'
    await rerender()
    await expect.poll(() => input.accept).toBe('video/*')
    result.current.open()
    expect(input.accept).toBe('video/*')
  })

  it('should work with a plain value for the directory option', async () => {
    const input = document.createElement('input')
    input.click = vi.fn()
    const inputRef = { current: input }
    let directory = true

    const { result, rerender } = await renderHook(() => useFileDialog({ input: inputRef, directory }))

    await expect.poll(() => input.webkitdirectory).toBe(true)
    result.current.open()
    expect(input.webkitdirectory).toBe(true)

    directory = false
    await rerender()
    await expect.poll(() => input.webkitdirectory).toBe(false)
    result.current.open()
    expect(input.webkitdirectory).toBe(false)
  })

  it('should work with a plain value for the reset option', async () => {
    const input = document.createElement('input')
    input.click = vi.fn()

    const { result } = await renderHook(() => useFileDialog({ input: { current: input }, reset: true }))
    result.current.open()

    expect(input.click).toHaveBeenCalled() // reset does not change input attributes
  })

  it('should work with a plain value for the capture option', async () => {
    const input = document.createElement('input')
    input.click = vi.fn()
    const inputRef = { current: input }
    let capture = 'user'

    const { result, rerender } = await renderHook(() => useFileDialog({ input: inputRef, capture }))

    await expect.poll(() => input.capture).toBe('user')
    result.current.open()
    expect(input.capture).toBe('user')

    capture = 'environment'
    await rerender()
    await expect.poll(() => input.capture).toBe('environment')
    result.current.open()
    expect(input.capture).toBe('environment')
  })

  it('useListener(onChange, cb) fires on file selection and unsubscribes on unmount', async () => {
    const input = document.createElement('input')
    const file = new File(['dummy content'], 'example.txt', { type: 'text/plain' })

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true,
    })

    const calls: Array<FileList | null | undefined> = []
    const { unmount } = await renderHook(() => {
      const dialog = useFileDialog({ input: { current: input } })
      useListener(dialog.onChange, (selected) => {
        calls.push(selected)
      })
      return dialog
    })

    // registered listener fires when a file is selected
    input.dispatchEvent(new Event('change'))
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[0]).toEqual(file)

    // after unmount the listener no longer fires
    unmount()
    input.dispatchEvent(new Event('change'))
    expect(calls).toHaveLength(1)
  })

  it('useListener(onCancel, cb) fires on cancel and unsubscribes on unmount', async () => {
    const input = document.createElement('input')

    const calls = vi.fn()
    const { unmount } = await renderHook(() => {
      const dialog = useFileDialog({ input: { current: input } })
      useListener(dialog.onCancel, () => {
        calls()
      })
      return dialog
    })

    input.dispatchEvent(new Event('cancel'))
    expect(calls).toHaveBeenCalledTimes(1)

    unmount()
    input.dispatchEvent(new Event('cancel'))
    expect(calls).toHaveBeenCalledTimes(1)
  })
})
