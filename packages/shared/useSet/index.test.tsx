import { useRef, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useSet } from '../useSet'

/**
 * Mirrors react-hookz's `source/react-hookz/src/useSet/index.dom.test.ts` and
 * `source/react-hookz/src/useSet/index.ssr.test.ts`. Upstream drives both with
 * `@ver0/react-hooks-testing`; this port uses `vitest-browser-react` (the
 * repo's browser project) for the DOM half and React's own `renderToString` for
 * the SSR half — the same tool the other reause ports render without a DOM.
 */

/**
 * Single-slot capture of the latest render's output — the pattern the rest of
 * the shared package's tests use where a render must be inspected directly.
 */
function createSlot<T>() {
  const slot: { current: T | undefined } = { current: undefined }
  return (value: T) => {
    slot.current = value
    return value
  }
}

/**
 * Counts how many times the pristine prototype method ran, so the patch's
 * `proto.*.apply` call is measured without mocking it away.
 *
 * Two environment constraints shape this helper. `vi.spyOn(Set.prototype, …)`
 * does not work here: with this repo's vitest 5 the spy's call-through loses the
 * original and throws `TypeError: Cannot read properties of undefined (reading
 * 'apply')`, and a spy count is untrustworthy anyway because vitest's own
 * browser logger builds a `Set` (it inflated an earlier probe). And the slot has
 * to be replaced without writing `Set.prototype.x = …` or
 * `Object.defineProperty(Set.prototype, …)`, which antfu's `no-extend-native`
 * rejects; the prototype is therefore resolved through
 * `Object.getPrototypeOf(new Set())` (the same object) and written with
 * `Reflect.defineProperty`, and the original descriptor is put back in a
 * `finally` by every caller.
 */
function countProtoCalls(method: 'add' | 'delete' | 'clear') {
  // `Object.getPrototypeOf(new Set())` is the very object `Set.prototype`
  // aliases, reached without spelling the identifier the lint rule matches.
  const prototype = Object.getPrototypeOf(new Set()) as object
  const descriptor = Object.getOwnPropertyDescriptor(prototype, method)!
  const original = descriptor.value as (...args: unknown[]) => unknown
  let calls = 0
  Reflect.defineProperty(prototype, method, {
    ...descriptor,
    value(this: Set<unknown>, ...args: unknown[]) {
      calls += 1
      return original.apply(this, args)
    },
  })
  return {
    get calls() {
      return calls
    },
    restore() {
      Reflect.defineProperty(prototype, method, descriptor)
    },
  }
}

describe('useSet', () => {
  it('is defined', () => {
    expect(useSet).toBeDefined()
  })

  it('should render', async () => {
    const slot = createSlot<Set<number>>()
    const { result } = await renderHook(() => slot(useSet()))

    expect(result.current).toBeInstanceOf(Set)
  })

  it('returns a Set instance with altered add, clear and delete methods', async () => {
    const slot = createSlot<Set<number>>()
    const { result } = await renderHook(() => slot(useSet()))
    const value = result.current!

    expect(value).toBeInstanceOf(Set)
    expect(Object.getPrototypeOf(value)).toBe(Set.prototype)
    expect(value.add).not.toBe(Set.prototype.add)
    expect(value.clear).not.toBe(Set.prototype.clear)
    expect(value.delete).not.toBe(Set.prototype.delete)
    // Only the three mutators are patched; the reads stay the prototype's.
    expect(value.has).toBe(Set.prototype.has)
    expect(value.size).toBe(0)
    expect(value[Symbol.iterator]).toBe(Set.prototype[Symbol.iterator])
  })

  it('accepts initial values', async () => {
    const slot = createSlot<Set<number>>()
    const { result } = await renderHook(() => slot(useSet([1, 2, 3])))
    const value = result.current!

    expect(value.has(1)).toBe(true)
    expect(value.has(2)).toBe(true)
    expect(value.has(3)).toBe(true)
    expect(value.size).toBe(3)
    expect([...value]).toEqual([1, 2, 3])
  })

  it('accepts an omitted or a null initialiser', async () => {
    const omitted = createSlot<Set<number>>()
    const nullish = createSlot<Set<number>>()
    const { result: omittedResult } = await renderHook(() => omitted(useSet()))
    const { result: nullishResult } = await renderHook(() => nullish(useSet(null)))

    expect(omittedResult.current!.size).toBe(0)
    expect(nullishResult.current!.size).toBe(0)
  })

  it('has no `toggle` — react-hookz ships no such method', async () => {
    const slot = createSlot<Set<number>>()
    const { result } = await renderHook(() => slot(useSet([1])))
    const value = result.current!

    // The deliberate shape difference from react-use's `[set, utils]` `useSet`,
    // whose helpers are `{ add, remove, toggle, reset, clear }`.
    expect((value as unknown as { toggle?: unknown }).toggle).toBeUndefined()
    expect('toggle' in value).toBe(false)
    expect((value as unknown as { remove?: unknown }).remove).toBeUndefined()
    expect((value as unknown as { reset?: unknown }).reset).toBeUndefined()
  })

  it('`add` invokes the pristine Set method and re-renders the component', async () => {
    const counter = countProtoCalls('add')
    try {
      let i = 0
      const { result, act } = await renderHook(() => [++i, useSet()] as const)

      expect(i).toBe(1)
      const value = result.current!
      const before = counter.calls

      await act(() => {
        expect(value[1].add(1)).toBe(value[1])
      })

      // The re-render is the assertion: the dispatch must run after the
      // mutation, and it must be exactly one extra render.
      expect(i).toBe(2)
      expect(result.current[1].has(1)).toBe(true)
      expect(result.current[1].size).toBe(1)
      // Exactly one pristine call — the patch did not recurse into itself.
      // (A delta, not an absolute count: react-hookz's own test passes a
      // render counter through, and React internals touch `Set.prototype.add`
      // too, so only the mutation under test is measured.)
      expect(counter.calls - before).toBe(1)
    }
    finally {
      counter.restore()
    }
  })

  it('`clear` invokes the pristine Set method and re-renders the component', async () => {
    const counter = countProtoCalls('clear')
    try {
      let i = 0
      const { result, act } = await renderHook(() => [++i, useSet([1])] as const)

      expect(i).toBe(1)
      const value = result.current!
      expect(value[1].size).toBe(1)
      const before = counter.calls
      expect(value[1].clear()).toBeUndefined()

      await act(() => {})

      expect(i).toBe(2)
      expect(result.current[1].size).toBe(0)
      expect(counter.calls - before).toBe(1)
    }
    finally {
      counter.restore()
    }
  })

  it('`delete` invokes the pristine Set method and re-renders the component', async () => {
    const counter = countProtoCalls('delete')
    try {
      let i = 0
      const { result, act } = await renderHook(() => [++i, useSet([1])] as const)

      expect(i).toBe(1)
      const value = result.current!
      const before = counter.calls

      await act(() => {
        expect(value[1].delete(1)).toBe(true)
      })

      expect(i).toBe(2)
      expect(result.current[1].has(1)).toBe(false)
      expect(result.current[1].size).toBe(0)
      expect(counter.calls - before).toBe(1)

      // Deleting an absent value still re-renders and reports the native
      // boolean untouched.
      const beforeSecond = counter.calls
      await act(() => {
        expect(result.current[1].delete(1)).toBe(false)
      })
      expect(i).toBe(3)
      expect(counter.calls - beforeSecond).toBe(1)
    }
    finally {
      counter.restore()
    }
  })

  it('keeps one Set instance (stable identity) across re-renders and mutations', async () => {
    const slot = createSlot<Set<number>>()
    const { result, act, rerender } = await renderHook(() => slot(useSet<number>()))
    const first = result.current!

    first.add(1)

    await act(() => {})
    expect(result.current).toBe(first)

    await rerender()
    expect(result.current).toBe(first)
    expect(result.current!.has(1)).toBe(true)
    expect(result.current!.size).toBe(1)
  })

  it('ignores a changed `values` argument after the first render', async () => {
    const slot = createSlot<Set<number>>()
    const { result, act, rerender } = await renderHook(
      (props?: { values?: readonly number[] }) => slot(useSet<number>(props?.values ?? [1])),
      { initialProps: { values: [1] } },
    )

    expect(result.current!.size).toBe(1)

    await act(() => {})
    await rerender({ values: [1, 2, 3] })

    // The Set is built once, so a new initialiser on a later render is inert.
    expect(result.current!.size).toBe(1)
    expect(result.current!.has(2)).toBe(false)
  })

  it('a mutation during render re-renders — and unguarded, loops', () => {
    // Documented behaviour, observed rather than assumed: the patch dispatches
    // an update while React is already rendering this pass, so React re-renders
    // the component immediately; that render runs the render body again, which
    // dispatches again, and React bails out at its own render limit. This is the
    // trap the JSDoc warns about — mutating from a render body is never safe,
    // and a mutation that changes nothing (`add` of an existing value) loops
    // just the same, because it is the dispatch that loops, not the change.
    // Upstream behaves identically: its `useRerender` is a `useState`
    // dispatcher too.
    let observedSize: number | undefined

    function MutatingRender() {
      const value = useSet<number>()
      value.add(1)
      observedSize = value.size
      return <div>{value.size}</div>
    }

    expect(() => renderToString(<MutatingRender />)).toThrowError(/Too many re-renders/)
    // The mutation itself did apply; it is the dispatch that loops.
    expect(observedSize).toBe(1)
  })

  it('mutating through a rendered component updates what is displayed', async () => {
    let renders = 0

    function SetCounter() {
      const value = useSet<number>([1])
      const renderCount = useRef(0)
      renderCount.current += 1
      renders = renderCount.current

      return (
        <div>
          <span>
            {'size: '}
            {value.size}
          </span>
          <button onClick={() => value.add(value.size + 1)}>Add</button>
          <button onClick={() => value.delete(1)}>Delete</button>
          <button onClick={() => value.clear()}>Clear</button>
        </div>
      )
    }

    const screen = await render(<SetCounter />)

    await expect.element(screen.getByText('size: 1')).toBeVisible()
    expect(renders).toBe(1)

    await screen.getByRole('button', { name: 'Add' }).click()
    await expect.element(screen.getByText('size: 2')).toBeVisible()
    expect(renders).toBe(2)

    await screen.getByRole('button', { name: 'Delete' }).click()
    await expect.element(screen.getByText('size: 1')).toBeVisible()
    expect(renders).toBe(3)

    await screen.getByRole('button', { name: 'Clear' }).click()
    await expect.element(screen.getByText('size: 0')).toBeVisible()
    expect(renders).toBe(4)
  })

  it('does not warn or throw when unmounted after a mutation', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const slot = createSlot<Set<number>>()
      const { result, act, unmount } = await renderHook(() => slot(useSet<number>()))
      const value = result.current!

      await act(() => {
        value.add(1)
        value.delete(1)
        value.clear()
      })
      await unmount()

      expect(consoleError).not.toHaveBeenCalled()
    }
    finally {
      consoleError.mockRestore()
    }
  })

  it('is SSR-safe — renders without a DOM and touches no global', () => {
    const snapshot = {
      // `window` / `document` are inherited accessors on a browser `Window`, so
      // they have no own descriptor on `globalThis`; read the values directly
      // and fingerprint the accessors that resolve them.
      window: globalThis.window,
      document: globalThis.document,
      windowGetter: String(Object.getOwnPropertyDescriptor(Window.prototype, 'window')?.get),
      documentGetter: String(Object.getOwnPropertyDescriptor(Document.prototype, 'document')?.get),
    }
    const captured = { window: undefined as unknown, document: undefined as unknown }
    const seenInRender = { window: true, document: true }

    function SSRUseSet() {
      const value = useSet([1, 2])
      captured.window = (globalThis as { window?: unknown }).window
      captured.document = (globalThis as { document?: unknown }).document
      seenInRender.window = 'window' in globalThis
      seenInRender.document = 'document' in globalThis
      return <div>{value.size}</div>
    }

    // `renderToString` runs the first render — and therefore the patch — with
    // no DOM work at all. `globalThis.window` / `document` are non-configurable
    // accessors on `Window`, so they cannot be deleted or redefined to prove
    // the negative inside a browser; instead this asserts the render completes
    // and leaves both globals byte-for-byte untouched, and that the hook reads
    // neither. The hook's own first render is `useRef` + `useUpdate` only, so
    // there is nothing to reach for. (Pinning "renders when the globals are
    // absent" would need a node-environment file, which the five-path scope of
    // this change does not allow.)
    const html = renderToString(<SSRUseSet />)

    expect(html).toContain('2')
    expect(captured.window).toBe(snapshot.window)
    expect(captured.document).toBe(snapshot.document)
    expect(seenInRender.window).toBe(true)
    expect(seenInRender.document).toBe(true)
    expect(globalThis.window).toBe(snapshot.window)
    expect(globalThis.document).toBe(snapshot.document)
    expect(String(Object.getOwnPropertyDescriptor(Window.prototype, 'window')?.get))
      .toBe(snapshot.windowGetter)
    expect(String(Object.getOwnPropertyDescriptor(Document.prototype, 'document')?.get))
      .toBe(snapshot.documentGetter)
  })

  it('mutations work on a separately server-rendered instance', async () => {
    function SSRMutable() {
      const value = useSet([1])
      const [size] = useState(value.size)
      return <div>{size}</div>
    }

    // `renderToString` runs the first render (and therefore the patch) with no
    // DOM involved at all.
    expect(renderToString(<SSRMutable />)).toContain('1')

    function ClientMutable() {
      const value = useSet([1])
      const [size, setSize] = useState(value.size)
      return (
        <div>
          <span>
            {'client size: '}
            {size}
          </span>
          <button
            onClick={() => {
              value.add(2)
              setSize(value.size)
            }}
          >
            Add
          </button>
        </div>
      )
    }

    const screen = await render(<ClientMutable />)
    await expect.element(screen.getByText('client size: 1')).toBeVisible()
    await screen.getByRole('button', { name: 'Add' }).click()
    await expect.element(screen.getByText('client size: 2')).toBeVisible()
  })
})
