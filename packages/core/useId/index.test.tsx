import { useState } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useId } from '../useId'

describe('useId', () => {
  it('should export', () => {
    expect(useId).toBeTypeOf('function')
  })

  it('should return a staticId verbatim', async () => {
    const { result } = await renderHook(() => useId('my-static-id'))

    expect(result.current).toBe('my-static-id')
  })

  it('should return an empty staticId verbatim', async () => {
    const { result } = await renderHook(() => useId(''))

    expect(result.current).toBe('')
  })

  it('should return a stable id across re-renders', async () => {
    const { result, rerender, act } = await renderHook(() => {
      const id = useId()
      const [tick, setTick] = useState(0)
      return { id, tick, setTick }
    })

    const id = result.current.id
    expect(id).toMatch(/^mantine-/)

    await rerender()
    expect(result.current.id).toBe(id)

    await act(() => {
      result.current.setTick(1)
    })

    expect(result.current.tick).toBe(1)
    expect(result.current.id).toBe(id)
  })

  it('should swap the pre-mount id for a random id after mount', async () => {
    // every value the hook returned, in render order: the first entry is the
    // render (server / hydration) value, the last one the committed result
    const rendered: string[] = []

    const { result } = await renderHook(() => {
      const id = useId()
      rendered.push(id)
      return id
    })

    // pre-mount: `mantine-` + React's own id, with upstream's colon strip applied
    expect(rendered[0]).toMatch(/^mantine-[^:]+$/)
    // the mount effect committed a second render — the id changed after mount
    expect(rendered.length).toBeGreaterThanOrEqual(2)
    expect(rendered.at(-1)).not.toBe(rendered[0])
    // post-mount: `randomId()` — base36 digits behind the same prefix
    expect(rendered.at(-1)).toMatch(/^mantine-[a-z0-9]+$/)
    expect(result.current).toBe(rendered.at(-1))
  })

  it('should keep the id once the two phases have settled', async () => {
    const rendered: string[] = []

    const { result, rerender, act } = await renderHook(() => {
      const id = useId()
      const [tick, setTick] = useState(0)
      rendered.push(id)
      return { id, tick, setTick }
    })

    const id = result.current.id

    await act(() => {
      result.current.setTick(1)
    })
    await rerender()

    expect(result.current.id).toBe(id)
    // the settled id is the post-mount one, and nothing re-randomises it: every
    // render after the swap returned the same value
    expect(rendered[0]).not.toBe(id)
    expect(rendered.slice(1).every(value => value === id)).toBe(true)
  })

  it('should keep the hook order stable when staticId is present', async () => {
    const { result, rerender, act } = await renderHook(
      (props?: { staticId?: string }) => {
        const id = useId(props?.staticId)
        // a hook after `useId`: it survives every re-render below only because
        // the `staticId` short-circuit sits *after* `useId`'s own hooks
        const [tick, setTick] = useState(0)
        return { id, tick, setTick }
      },
      { initialProps: { staticId: 'my-static-id' } },
    )

    expect(result.current.id).toBe('my-static-id')

    await act(() => {
      result.current.setTick(1)
    })
    expect(result.current.tick).toBe(1)
    expect(result.current.id).toBe('my-static-id')

    // dropping the override must not shift the hook order — with the early
    // return above the hooks React would throw "Rendered more hooks than
    // during the previous render" here
    await rerender({ staticId: undefined })
    expect(result.current.tick).toBe(1)
    expect(result.current.id).toMatch(/^mantine-/)

    // ...and adding it back is just as stable
    await rerender({ staticId: 'late-static-id' })
    expect(result.current.tick).toBe(1)
    expect(result.current.id).toBe('late-static-id')
  })

  it('should generate a distinct id per call', async () => {
    const { result } = await renderHook(() => [useId(), useId()] as const)

    expect(result.current[0]).toMatch(/^mantine-/)
    expect(result.current[0]).not.toBe(result.current[1])
  })

  it('types: returns a string and takes an optional string', async () => {
    const { result } = await renderHook(() => useId('fixed'))

    expectTypeOf(result.current).toEqualTypeOf<string>()
    expectTypeOf(useId).parameter(0).toEqualTypeOf<string | undefined>()
    expectTypeOf(useId).returns.toEqualTypeOf<string>()
  })
})
