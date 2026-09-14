import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useStateDefault } from '../useStateDefault'

describe('useStateDefault', () => {
  it('should be defined', () => {
    expect(useStateDefault).toBeDefined()
  })

  it('shows the default value when the source is undefined', async () => {
    const { result } = await renderHook(() => useStateDefault(undefined as string | undefined, 'default'))

    const [value, setValue] = result.current
    expect(value).toBe('default')
    expect(typeof setValue).toBe('function')
  })

  it('shows the default value when the source is null', async () => {
    const { result } = await renderHook(() => useStateDefault(null as string | null, 'default'))

    expect(result.current[0]).toBe('default')
  })

  it('shows the source value when it is set', async () => {
    const { result } = await renderHook(() => useStateDefault('hello' as string | null, 'default'))

    expect(result.current[0]).toBe('hello')
  })

  it('shows the source value when it is falsy but not nullish', async () => {
    const { result } = await renderHook(() => useStateDefault('' as string | null, 'default'))

    expect(result.current[0]).toBe('')
  })

  it('updates the value and writes through to the tuple source', async () => {
    const { result, act } = await renderHook(() => {
      const [raw, setRaw] = useState<string | null | undefined>(undefined)
      return { state: useStateDefault([raw, setRaw], 'default'), raw }
    })

    expect(result.current.state[0]).toBe('default')

    await act(async () => {
      result.current.state[1]('hello')
    })
    expect(result.current.state[0]).toBe('hello')
    expect(result.current.raw).toBe('hello')
  })

  it('falls back to the default when set to undefined or null', async () => {
    const { result, act } = await renderHook(() => {
      const [raw, setRaw] = useState<string | null | undefined>(undefined)
      return { state: useStateDefault([raw, setRaw], 'default'), raw }
    })

    await act(async () => {
      result.current.state[1]('hello')
    })
    expect(result.current.state[0]).toBe('hello')

    await act(async () => {
      result.current.state[1](undefined)
    })
    expect(result.current.state[0]).toBe('default')
    expect(result.current.raw).toBeUndefined()

    await act(async () => {
      result.current.state[1](null)
    })
    expect(result.current.state[0]).toBe('default')
    expect(result.current.raw).toBeNull()
  })

  it('accepts an updater function from setValue', async () => {
    const { result, act } = await renderHook(() => {
      const [raw, setRaw] = useState<number | null | undefined>(0)
      return { state: useStateDefault([raw, setRaw], 0), raw }
    })

    await act(async () => {
      result.current.state[1](current => (current ?? 0) + 1)
    })
    expect(result.current.state[0]).toBe(1)
    expect(result.current.raw).toBe(1)
  })

  it('resolves plain values for the source input', async () => {
    const { result, act } = await renderHook(() => useStateDefault('initial' as string | undefined, 'default'))

    expect(result.current[0]).toBe('initial')

    // a plain-value source is read-only — setValue cannot write back to it, so
    // `value` keeps deriving from the source (only a `[value, setter]` tuple
    // or a `{ value, onChange }` pair supports the write-through)
    await act(async () => {
      result.current[1]('set')
    })
    expect(result.current[0]).toBe('initial')
  })

  it('reflects external writes to the tuple source on re-render', async () => {
    const { result, act } = await renderHook(() => {
      const [raw, setRaw] = useState<string | null | undefined>(undefined)
      return { state: useStateDefault([raw, setRaw], 'default'), setRaw }
    })

    expect(result.current.state[0]).toBe('default')

    await act(async () => {
      result.current.setRaw('from outside')
    })
    expect(result.current.state[0]).toBe('from outside')
  })

  it('is SSR safe — renderToString produces the default value without effects', async () => {
    function SSRStateDefault() {
      const [value] = useStateDefault(undefined as string | undefined, 'default')
      return <div>{value}</div>
    }

    const html = await renderToString(<SSRStateDefault />)
    expect(html).toContain('default')
  })

  it('accepts a state tuple source and writes through to its setter', async () => {
    const { result, act } = await renderHook(() => {
      const [raw, setRaw] = useState<string | null | undefined>(undefined)
      return { state: useStateDefault([raw, setRaw], 'default'), raw, setRaw }
    })

    expect(result.current.state[0]).toBe('default')

    await act(async () => {
      result.current.state[1]('hello')
    })
    expect(result.current.state[0]).toBe('hello')
    expect(result.current.raw).toBe('hello')

    await act(async () => {
      result.current.state[1](undefined)
    })
    expect(result.current.state[0]).toBe('default')
    expect(result.current.raw).toBeUndefined()
  })

  it('accepts a { value, onChange } source and writes through to onChange', async () => {
    const { result, act } = await renderHook(() => {
      const [raw, setRaw] = useState<string | null | undefined>(undefined)
      return { state: useStateDefault({ value: raw, onChange: setRaw }, 'default'), raw, setRaw }
    })

    expect(result.current.state[0]).toBe('default')

    await act(async () => {
      result.current.state[1]('hello')
    })
    expect(result.current.state[0]).toBe('hello')
    expect(result.current.raw).toBe('hello')

    await act(async () => {
      result.current.state[1](null)
    })
    expect(result.current.state[0]).toBe('default')
    expect(result.current.raw).toBeNull()
  })
})

describe('useStateDefault (component)', () => {
  function UseStateDefaultDemo() {
    const [raw, setRaw] = useState<string | null | undefined>(undefined)
    const [value, setValue] = useStateDefault([raw, setRaw], 'default')

    return (
      <div>
        <button onClick={() => setValue('hello')}>Set hello</button>
        <button onClick={() => setValue(undefined)}>Clear</button>
        <p>
          Value:
          {' '}
          {value}
        </p>
        <p>
          Raw:
          {' '}
          {String(raw)}
        </p>
      </div>
    )
  }

  it('shows the default and reacts to setValue', async () => {
    const screen = await render(<UseStateDefaultDemo />)
    const setHello = screen.getByRole('button', { name: 'Set hello' })
    const clear = screen.getByRole('button', { name: 'Clear' })

    await expect.element(screen.getByText('Value: default')).toBeVisible()
    await expect.element(screen.getByText('Raw: undefined')).toBeVisible()

    await setHello.click()
    await expect.element(screen.getByText('Value: hello')).toBeVisible()
    await expect.element(screen.getByText('Raw: hello')).toBeVisible()

    await clear.click()
    await expect.element(screen.getByText('Value: default')).toBeVisible()
    await expect.element(screen.getByText('Raw: undefined')).toBeVisible()
  })
})
