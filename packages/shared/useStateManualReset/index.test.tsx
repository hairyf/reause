import { expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useStateManualReset } from '../useStateManualReset'

it('useStateManualReset should be defined', () => {
  expect(useStateManualReset).toBeDefined()
})

it('useStateManualReset should be default at first', async () => {
  const { result } = await renderHook(() => useStateManualReset('default'))

  expect(result.current[0]).toBe('default')
})

it('useStateManualReset should be updated', async () => {
  const { result, act } = await renderHook(() => useStateManualReset('default'))

  await act(() => result.current[1]('update'))
  expect(result.current[0]).toBe('update')
})

it('useStateManualReset should be reset', async () => {
  const { result, act } = await renderHook(() => useStateManualReset('default'))

  await act(() => result.current[1]('update'))
  expect(result.current[0]).toBe('update')

  await act(() => result.current[2]())
  expect(result.current[0]).toBe('default')
})

it('useStateManualReset supports a controlled state object', async () => {
  let value = 'default'
  const onChange = (next: string) => {
    value = next
  }
  const { result, act, rerender } = await renderHook(() => useStateManualReset({ value, onChange }))

  expect(result.current[0]).toBe('default')
  await act(() => result.current[1]('update'))
  expect(value).toBe('update')
  // the parent re-renders with the new value (onChange already ran)
  await rerender()
  expect(result.current[0]).toBe('update')

  // reset must fire onChange with the initial default — no manual restore
  // (a reset no-op would leave `value` at 'update' and fail the assertion)
  await act(() => result.current[2]())
  expect(value).toBe('default')
})

it('useStateManualReset supports a state tuple', async () => {
  let value = 'default'
  const setValue = (next: string | ((prev: string) => string)) => {
    value = typeof next === 'function' ? next(value) : next
  }
  const { result, act, rerender } = await renderHook(() => useStateManualReset([value, setValue] as const))

  await act(() => result.current[1]('update'))
  expect(value).toBe('update')
  await rerender()

  // reset restores the initial argument value through the tuple setter
  await act(() => result.current[2]())
  expect(value).toBe('default')
})

it('useStateManualReset restores a lazy-getter default', async () => {
  const defaultValue = 'default'
  const { result, act } = await renderHook(() => useStateManualReset(() => defaultValue))

  expect(result.current[0]).toBe('default')

  await act(() => result.current[1]('update'))
  expect(result.current[0]).toBe('update')

  // the getter source stays constant — only the displayed value changed, so a
  // restore can only come from `reset` (the passive sync has nothing to push)
  await act(() => result.current[2]())
  expect(result.current[0]).toBe('default')
})
