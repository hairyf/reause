import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { createMemo } from '../createMemo'

// The intended usage: the factory is called once, at module scope, and its
// result is bound to a `useXxx` name so it is lint-checkable as a hook.
const fullNameCompute = vi.fn((first: string, last: string) => `${first} ${last}`)
const useFullName = createMemo(fullNameCompute)

function Profile({ first, last }: { first: string, last: string }) {
  const fullName = useFullName(first, last)

  return <span>{fullName}</span>
}

describe('createMemo', () => {
  it('is defined', () => {
    expect(createMemo).toBeTypeOf('function')
  })

  it('computes once for unchanged args across re-renders', async () => {
    const compute = vi.fn((a: number, b: number) => a + b)
    const useSum = createMemo(compute)

    const { result, rerender } = await renderHook(() => useSum(1, 2))

    expect(result.current).toBe(3)

    await rerender()
    await rerender()
    await rerender()

    expect(result.current).toBe(3)
    // the memoised body never re-ran, not merely returned an equal value
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('recomputes when the args change', async () => {
    const compute = vi.fn((a: number, b: number) => a + b)
    const useSum = createMemo(compute)

    const { result, rerender } = await renderHook(
      ({ a, b }: { a: number, b: number } = { a: 1, b: 2 }) => useSum(a, b),
      { initialProps: { a: 1, b: 2 } },
    )

    expect(result.current).toBe(3)
    expect(compute).toHaveBeenCalledTimes(1)

    await rerender({ a: 1, b: 5 })
    expect(result.current).toBe(6)
    expect(compute).toHaveBeenCalledTimes(2)

    // identical args again — no further recomputation
    await rerender({ a: 1, b: 5 })
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('recomputes for a new reference even when it is structurally equal', async () => {
    const compute = vi.fn((point: { x: number, y: number }) => point.x + point.y)
    const useSum = createMemo(compute)
    const stable = { x: 1, y: 2 }

    const { result, rerender } = await renderHook(
      ({ point }: { point: { x: number, y: number } } = { point: stable }) => useSum(point),
      { initialProps: { point: stable } },
    )

    expect(result.current).toBe(3)
    await rerender({ point: stable })
    // the same reference is the same dependency
    expect(compute).toHaveBeenCalledTimes(1)

    // a structurally equal but *new* object is a different dependency: the raw
    // `args` are compared by reference, exactly like upstream
    await rerender({ point: { x: 1, y: 2 } })
    expect(result.current).toBe(3)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('can be defined once at module scope and used as a hook in a component', async () => {
    fullNameCompute.mockClear()

    const screen = await render(<Profile first="Ada" last="Lovelace" />)

    await expect.element(screen.getByText('Ada Lovelace')).toBeVisible()
    expect(fullNameCompute).toHaveBeenCalledTimes(1)
  })

  it('memoises across re-renders of a mounted component', async () => {
    const compute = vi.fn((label: string) => `${label}!`)
    const useExclaim = createMemo(compute)

    function Counter() {
      const [count, setCount] = useState(0)
      const label = useExclaim('hello')

      return (
        <div>
          <span>{`${label} ${count}`}</span>
          <button onClick={() => setCount(prev => prev + 1)}>inc</button>
        </div>
      )
    }

    const screen = await render(<Counter />)

    await expect.element(screen.getByText('hello! 0')).toBeVisible()
    expect(compute).toHaveBeenCalledTimes(1)

    await screen.getByRole('button', { name: 'inc' }).click()
    await expect.element(screen.getByText('hello! 1')).toBeVisible()

    // the component re-rendered, the args did not change
    expect(compute).toHaveBeenCalledTimes(1)
  })
})
