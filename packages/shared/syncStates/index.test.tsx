import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { syncStates } from '../syncStates'

describe('syncStates', () => {
  it('should be defined', () => {
    expect(syncStates).toBeDefined()
  })

  it('should work with array', async () => {
    const { result, act } = await renderHook(() => {
      const [source, setSource] = useState('foo')
      const [target1, setTarget1] = useState('bar')
      const [target2, setTarget2] = useState('bar2')
      return {
        stop: syncStates(source, [[target1, setTarget1], [target2, setTarget2]]),
        setSource,
        target1,
        target2,
      }
    })

    // upstream: immediate sync on setup (default `immediate: true`) — here the
    // initial sync runs in the mount effect, i.e. once the hook has rendered
    expect(result.current.target1).toBe('foo')
    expect(result.current.target2).toBe('foo')

    // upstream: `source.value = 'bar'` fires the watcher synchronously — in
    // React the new source value is adopted on the following commit
    await act(() => result.current.setSource('bar'))

    expect(result.current.target1).toBe('bar')
    expect(result.current.target2).toBe('bar')

    result.current.stop()

    await act(() => result.current.setSource('bar2'))

    expect(result.current.target1).toBe('bar')
    expect(result.current.target2).toBe('bar')
  })

  it('should work with non-array', async () => {
    const { result, act } = await renderHook(() => {
      const [source, setSource] = useState('foo')
      const [target, setTarget] = useState('bar')
      return { stop: syncStates(source, [target, setTarget]), setSource, target }
    })

    expect(result.current.target).toBe('foo')

    await act(() => result.current.setSource('bar'))

    expect(result.current.target).toBe('bar')

    result.current.stop()

    await act(() => result.current.setSource('bar2'))

    expect(result.current.target).toBe('bar')
  })

  it('does not sync on mount when immediate is false', async () => {
    const { result } = await renderHook(() => {
      const [target, setTarget] = useState('bar')
      syncStates('foo', [target, setTarget], { immediate: false })
      return { target }
    })

    expect(result.current.target).toBe('bar')
  })

  it('syncs a later change when immediate is false', async () => {
    const { result, act } = await renderHook(() => {
      const [source, setSource] = useState('foo')
      const [target, setTarget] = useState('bar')
      syncStates(source, [target, setTarget], { immediate: false })
      return { target, setSource }
    })

    // nothing on mount
    expect(result.current.target).toBe('bar')

    // a later source change syncs post-commit
    await act(() => result.current.setSource('baz'))
    expect(result.current.target).toBe('baz')
  })

  it('returns a stable stop across renders', async () => {
    const { result, rerender } = await renderHook(() => {
      const [target, setTarget] = useState('bar')
      return { stop: syncStates('foo', [target, setTarget]) }
    })

    const stop = result.current.stop
    await rerender()

    expect(result.current.stop).toBe(stop)
  })

  it('does not clobber targets when an unrelated re-render happens', async () => {
    const { result, act, rerender } = await renderHook(() => {
      const [target, setTarget] = useState('foo')
      syncStates('foo', [target, setTarget])
      return { target, setTarget }
    })

    await act(() => result.current.setTarget('custom'))

    // the source did not change — the target keeps its own value
    expect(result.current.target).toBe('custom')

    await rerender()
    expect(result.current.target).toBe('custom')
  })

  it('accepts a lazy-getter source', async () => {
    let source = 'foo'
    const { result, rerender } = await renderHook(() => {
      const [target, setTarget] = useState('bar')
      syncStates(() => source, [target, setTarget])
      return { target }
    })

    expect(result.current.target).toBe('foo')

    // the getter is re-read on every commit — a bare mutation is only adopted
    // once something re-renders
    source = 'bar'
    await rerender()

    expect(result.current.target).toBe('bar')
  })

  it('syncs a [value, setter] tuple target through its setter', async () => {
    const { result, act } = await renderHook(() => {
      const [source, setSource] = useState('foo')
      const [target, setTarget] = useState('bar')
      const stop = syncStates(source, [target, setTarget])
      return { target, setSource, stop }
    })

    // immediate sync writes through the tuple setter
    await vi.waitFor(() => {
      expect(result.current.target).toBe('foo')
    })

    // a source change propagates through the setter
    await act(() => result.current.setSource('next'))
    await vi.waitFor(() => {
      expect(result.current.target).toBe('next')
    })

    // stop tears the sync down
    result.current.stop()
    await act(() => result.current.setSource('stopped'))
    expect(result.current.target).toBe('next')
  })
})

describe('syncStates (component)', () => {
  function SyncStatesDemo() {
    const [source, setSource] = useState('')
    const [target1, setTarget1] = useState('')
    const [target2, setTarget2] = useState('')

    // tuple targets — the syncStates effect writes through each target's
    // setter, which lands in state and re-renders the inputs
    syncStates(source, [[target1, setTarget1], [target2, setTarget2]])

    return (
      <div>
        <input
          value={source}
          type="text"
          placeholder="Source"
          onChange={e => setSource(e.target.value)}
        />
        <input
          value={target1}
          type="text"
          placeholder="Target1"
          onChange={e => setTarget1(e.target.value)}
        />
        <input
          value={target2}
          type="text"
          placeholder="Target2"
          onChange={e => setTarget2(e.target.value)}
        />
      </div>
    )
  }

  it('syncs the source input to the target inputs', async () => {
    const screen = await render(<SyncStatesDemo />)
    const sourceInput = screen.getByPlaceholder('Source')
    const target1 = screen.getByPlaceholder('Target1')
    const target2 = screen.getByPlaceholder('Target2')

    await sourceInput.fill('hello')

    // changes propagate to both targets
    await expect.element(target1).toHaveValue('hello')
    await expect.element(target2).toHaveValue('hello')

    // one-way: editing a target does not propagate back to the source
    await target1.fill('custom')

    await expect.element(sourceInput).toHaveValue('hello')
    await expect.element(target2).toHaveValue('hello')

    // a further source edit overwrites the previously edited target
    await sourceInput.fill('world')

    await expect.element(target1).toHaveValue('world')
    await expect.element(target2).toHaveValue('world')
  })
})
