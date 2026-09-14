import type { SyncStateOptions, SyncStateTransform } from '../syncState'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { syncState } from '../syncState'

// type-level helpers (upstream imports these from @type-challenges/utils,
// which reause does not depend on)
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
type Expect<T extends true> = T

describe('syncState', () => {
  it('should be defined', () => {
    expect(syncState).toBeDefined()
  })

  it('should work', async () => {
    const { result, act } = await renderHook(() => {
      const [a, setA] = useState('foo')
      const [b, setB] = useState('bar')
      const stop = syncState([a, setA], [b, setB])
      return { a, b, setA, setB, stop }
    })

    // upstream: immediate sync on setup (default `immediate: true`) — here the
    // initial sync runs in the mount effect, i.e. once the hook has rendered
    expect(result.current.b).toBe('foo')

    // a left-side write lands in the right side through its setter
    await act(() => result.current.setA('bar'))
    expect(result.current.a).toBe('bar')
    expect(result.current.b).toBe('bar')

    // a right-side write propagates back to the left side
    await act(() => result.current.setB('foo'))
    expect(result.current.a).toBe('foo')
    expect(result.current.b).toBe('foo')

    result.current.stop()

    await act(() => result.current.setA('bar2'))
    expect(result.current.a).toBe('bar2')
    expect(result.current.b).toBe('foo')
  })

  it('works with rtl direction', async () => {
    const { result, act } = await renderHook(() => {
      const [left, setLeft] = useState('left')
      const [right, setRight] = useState('right')
      syncState([left, setLeft], [right, setRight], { direction: 'rtl' })
      return { left, right, setLeft, setRight }
    })

    // immediate sync right → left
    expect(result.current.left).toBe('right')
    expect(result.current.right).toBe('right')

    // rtl: changing left does not propagate back to right
    await act(() => result.current.setLeft('bar'))
    expect(result.current.left).toBe('bar')
    expect(result.current.right).toBe('right')

    await act(() => result.current.setRight('foobar'))
    expect(result.current.left).toBe('foobar')
    expect(result.current.right).toBe('foobar')
  })

  it('works with ltr direction', async () => {
    const { result, act } = await renderHook(() => {
      const [left, setLeft] = useState('left')
      const [right, setRight] = useState('right')
      syncState([left, setLeft], [right, setRight], { direction: 'ltr' })
      return { left, right, setLeft, setRight }
    })

    // immediate sync left → right
    expect(result.current.left).toBe('left')
    expect(result.current.right).toBe('left')

    // ltr: changing right does not propagate back to left
    await act(() => result.current.setRight('bar'))
    expect(result.current.left).toBe('left')
    expect(result.current.right).toBe('bar')

    await act(() => result.current.setLeft('foobar'))
    expect(result.current.left).toBe('foobar')
    expect(result.current.right).toBe('foobar')
  })

  it('works with mutual convertors', async () => {
    const { result, act } = await renderHook(() => {
      const [left, setLeft] = useState(10)
      const [right, setRight] = useState(2)
      syncState([left, setLeft], [right, setRight], {
        transform: {
          ltr: left => left * 2,
          rtl: right => Math.floor(right / 3),
        },
      })
      return { left, right, setLeft, setRight }
    })

    // check immediately sync
    expect(result.current.right).toBe(20)
    expect(result.current.left).toBe(6)

    await act(() => result.current.setLeft(30))
    expect(result.current.right).toBe(60)
    expect(result.current.left).toBe(30)

    await act(() => result.current.setRight(10))
    expect(result.current.right).toBe(10)
    expect(result.current.left).toBe(3)
  })

  it('works with only rtl convertor', async () => {
    const { result, act } = await renderHook(() => {
      const [left, setLeft] = useState(10)
      const [right, setRight] = useState(2)
      syncState([left, setLeft], [right, setRight], {
        direction: 'rtl',
        transform: {
          rtl: right => Math.round(right / 2),
        },
      })
      return { left, right, setLeft, setRight }
    })

    // check immediately sync
    expect(result.current.right).toBe(2)
    expect(result.current.left).toBe(1)

    await act(() => result.current.setLeft(10))
    expect(result.current.right).toBe(2)
    expect(result.current.left).toBe(10)

    await act(() => result.current.setRight(10))
    expect(result.current.right).toBe(10)
    expect(result.current.left).toBe(5)
  })

  it('does not sync on mount when immediate is false', async () => {
    const { result, act } = await renderHook(() => {
      const [a, setA] = useState('foo')
      const [b, setB] = useState('bar')
      syncState([a, setA], [b, setB], { immediate: false })
      return { a, b, setA }
    })

    expect(result.current.a).toBe('foo')
    expect(result.current.b).toBe('bar')

    await act(() => result.current.setA('baz'))

    expect(result.current.a).toBe('baz')
    expect(result.current.b).toBe('baz')
  })

  it('syncs two [value, setter] tuple sides two-way', async () => {
    const { result, act } = await renderHook(() => {
      const [left, setLeft] = useState('left')
      const [right, setRight] = useState('right')
      const stop = syncState([left, setLeft], [right, setRight])
      return { left, right, setLeft, setRight, stop }
    })

    // immediate sync: left → right (through the setter)
    expect(result.current.right).toBe('left')
    expect(result.current.left).toBe('left')

    // external left change propagates into the right side
    await act(() => result.current.setLeft('from-left'))
    expect(result.current.right).toBe('from-left')

    // setter-driven change propagates back into the left side
    await act(() => result.current.setRight('from-right'))
    expect(result.current.left).toBe('from-right')

    // stop tears the sync down
    result.current.stop()
    await act(() => result.current.setLeft('stopped'))
    expect(result.current.right).toBe('from-right')
  })

  it('syncs a tuple side with a { value, onChange } pair and propagates value changes back', async () => {
    const onChange = vi.fn()
    const { result, act, rerender } = await renderHook(
      ({ value }: { value: string } = { value: 'right' }) => {
        const [left, setLeft] = useState('left')
        const stop = syncState([left, setLeft], { value, onChange })
        return { left, setLeft, stop }
      },
      { initialProps: { value: 'right' } },
    )

    // immediate sync publishes through onChange
    expect(onChange).toHaveBeenCalledWith('left')
    expect(result.current.left).toBe('left')

    // a left-side change publishes through onChange
    await act(() => result.current.setLeft('from-left'))
    expect(onChange).toHaveBeenLastCalledWith('from-left')
    expect(result.current.left).toBe('from-left')

    // a changed `value` prop propagates back to the left side
    await rerender({ value: 'from-pair' })
    expect(result.current.left).toBe('from-pair')

    // stop tears the sync down — no further onChange calls
    result.current.stop()
    const callsAfterStop = onChange.mock.calls.length
    await act(() => result.current.setLeft('stopped'))
    expect(onChange).toHaveBeenCalledTimes(callsAfterStop)
  })

  it('treats a plain-value side as read-only', async () => {
    const plain = 'static'
    const { result, act, rerender } = await renderHook(() => {
      const [target, setTarget] = useState('target')
      syncState(plain, [target, setTarget])
      return { target, setTarget }
    })

    // immediate sync: plain → target
    expect(result.current.target).toBe('static')

    // the plain side has no write path — a target change never writes back
    await act(() => result.current.setTarget('changed'))
    expect(result.current.target).toBe('changed')

    // and a later re-render does not clobber the target with the stale plain
    // value (the read-only side is not recorded as written)
    await rerender()
    expect(result.current.target).toBe('changed')
  })

  it('should type check the transform contract', () => {
    /* eslint-disable ts/no-unused-expressions */
    // upstream makes `transform` required when L and R are unrelated; the
    // reause port intentionally keeps it unconditionally `Partial` (a missing
    // convertor falls back to identity) — assert that looser contract here
    type L = number
    type R = string

    'test' as any as Expect<Equal<SyncStateTransform<L, R>, {
      ltr: (left: L) => R
      rtl: (right: R) => L
    }>>

    'test' as any as Expect<Equal<SyncStateOptions<L, R>['transform'], Partial<SyncStateTransform<L, R>> | undefined>>

    // a fully-specified transform is assignable
    const full: SyncStateOptions<L, R> = {
      transform: {
        ltr: left => String(left * 2),
        rtl: right => right.length,
      },
    }
    full satisfies SyncStateOptions<L, R>

    // a Partial transform (one convertor missing) is assignable too
    const partial: SyncStateOptions<L, R> = {
      transform: {
        rtl: right => right.length,
      },
    }
    partial satisfies SyncStateOptions<L, R>
    /* eslint-enable ts/no-unused-expressions */
  })
})

describe('syncState (component)', () => {
  function SyncStateDemo() {
    const [a, setA] = useState('')
    const [b, setB] = useState('')

    // tuple sides — the syncState effect writes through each side's setter,
    // which lands in state and re-renders the inputs
    syncState([a, setA], [b, setB])

    return (
      <div>
        <input value={a} type="text" placeholder="A" onChange={e => setA(e.target.value)} />
        <input value={b} type="text" placeholder="B" onChange={e => setB(e.target.value)} />
      </div>
    )
  }

  it('syncs both inputs two-way', async () => {
    const screen = await render(<SyncStateDemo />)
    const inputA = screen.getByPlaceholder('A')
    const inputB = screen.getByPlaceholder('B')

    // typing in A propagates to B
    await inputA.fill('hello')
    await expect.element(inputA).toHaveValue('hello')
    await expect.element(inputB).toHaveValue('hello')

    // typing in B propagates back to A (two-way)
    await inputB.fill('world')
    await expect.element(inputB).toHaveValue('world')
    await expect.element(inputA).toHaveValue('world')
  })
})
