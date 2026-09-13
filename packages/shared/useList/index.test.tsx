import type { ListActions } from '../useList'
import { renderToString } from 'react-dom/server'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useList } from '../useList'

/**
 * Mirrors react-use's `source/react-use/tests/useList.test.ts` — every action
 * case it covers is reproduced here, and the extra cases (action identity, the
 * synchronous ref read, the arity rule, `reset`'s memoised initial value, the
 * first-render aliasing and SSR) pin the parts of the contract the issue calls
 * out. Upstream drives its cases with `@testing-library/react-hooks`; this port
 * uses `vitest-browser-react`, the repo's browser project, exactly as the
 * sibling ports do.
 *
 * Upstream's `getHook` returns the render counter alongside the hook result so
 * a re-render is asserted rather than assumed; the vitest-browser-react
 * `renderHook` is async, so this helper is awaited. Like upstream, the counter
 * is read as `result.current[0]`.
 */
function renderList<T>(initialArray?: T[]) {
  let renders = 0
  return renderHook(
    (props?: T[]): [number, [T[], ListActions<T>]] => [++renders, useList(props)],
    { initialProps: initialArray },
  )
}

describe('useList', () => {
  it('is defined', () => {
    expect(useList).toBeDefined()
  })

  it('declares the pin\'s signature — `[list, ListActions<T>]`', () => {
    // `expectTypeOf` takes a value, so assert on the *function* rather than on
    // a call — invoking the hook outside a component would be an invalid hook
    // call at runtime.
    expectTypeOf(useList<number>).returns.toEqualTypeOf<[number[], ListActions<number>]>()
    // The action set is `ListActions<T>` itself, so `remove` is part of the
    // declared type (upstream declares it and only deprecates it in JSDoc).
    expectTypeOf<ListActions<number>['set']>().toEqualTypeOf<(newList: number[] | ((prevState: number[]) => number[]) | (() => number[])) => void>()
  })

  it('should init with 1st parameter and actions', async () => {
    const hook = await renderList([1, 2, 3])
    const [, [list, actions]] = hook.result.current

    expect(list).toEqual([1, 2, 3])
    expect(actions).toStrictEqual({
      set: expect.any(Function),
      push: expect.any(Function),
      updateAt: expect.any(Function),
      insertAt: expect.any(Function),
      update: expect.any(Function),
      updateFirst: expect.any(Function),
      upsert: expect.any(Function),
      sort: expect.any(Function),
      filter: expect.any(Function),
      removeAt: expect.any(Function),
      remove: expect.any(Function),
      clear: expect.any(Function),
      reset: expect.any(Function),
    })
  })

  it('should return the same actions object each render', async () => {
    const hook = await renderList([1, 2, 3])
    const [, [, actions]] = hook.result.current

    await hook.act(() => {
      actions.set([1, 2, 3, 4])
    })

    expect(actions).toBe(hook.result.current[1][1])
  })

  it('should default with empty array', async () => {
    const hook = await renderList()
    expect(hook.result.current[1][0]).toEqual([])
  })

  describe('set()', () => {
    it('should reset list with given array and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { set }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        set([1, 2, 3, 4])
      })
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 4])
      expect(hook.result.current[0]).toBe(2)

      await hook.act(() => {
        set([1, 2, 3, 4, 5])
      })
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 4, 5])
      expect(hook.result.current[0]).toBe(3)
    })

    it('accepts an updater and a zero-argument factory', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { set }]] = hook.result.current

      await hook.act(() => {
        set(prev => [...prev, 4])
      })
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 4])
      expect(hook.result.current[0]).toBe(2)

      await hook.act(() => {
        set(() => [9])
      })
      expect(hook.result.current[1][0]).toEqual([9])
      expect(hook.result.current[0]).toBe(3)
    })

    it('resolves a function action by arity, as the pin does', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { set }]] = hook.result.current
      const argumentCounts: number[] = []

      // `(...args)` has `length === 0`, so react-use's
      // `nextState.length ? nextState(currentState) : nextState()` calls it with
      // **no** argument. A React-`SetStateAction`-style resolution (`fn(prev)`)
      // would report 1 here — this is the one place the two differ, and the pin
      // is what this port mirrors.
      await hook.act(() => {
        set((...args: number[][]) => {
          argumentCounts.push(args.length)
          return [7]
        })
      })

      expect(argumentCounts).toEqual([0])
      expect(hook.result.current[1][0]).toEqual([7])
    })

    it('passes the current list to a one-argument updater', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { set }]] = hook.result.current
      let seen: number[] | undefined

      await hook.act(() => {
        set((prev) => {
          seen = prev
          return prev.concat(4)
        })
      })

      expect(seen).toEqual([1, 2, 3])
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 4])
    })
  })

  describe('push()', () => {
    it('should add arbitrary amount of items to the end and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { push }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        push(1, 2, 3, 4)
      })
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 1, 2, 3, 4])
      expect(hook.result.current[0]).toBe(2)
    })

    it('should not do anything if called with no parameters', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [list, { push }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        push()
      })
      expect(hook.result.current[0]).toBe(1)
      expect(list).toBe(hook.result.current[1][0])
    })
  })

  describe('updateAt()', () => {
    it('should replace item at given index with given value and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { updateAt }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        updateAt(1, 5)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 5, 3])
    })

    it('should work fine if target index is out of array length', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { updateAt }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        updateAt(5, 6)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, undefined, undefined, 6])
    })
  })

  describe('insertAt()', () => {
    it('should insert item at given index shifting all the right elements and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { insertAt }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        insertAt(1, 5)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 5, 2, 3])
    })

    it('should work if index is out of array length', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { insertAt }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        insertAt(5, 6)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, undefined, undefined, 6])
    })

    it('appends when the index equals the list length (the `>` boundary)', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { insertAt }]] = hook.result.current

      await hook.act(() => {
        insertAt(3, 4)
      })

      // `index > arr.length` is false at exactly the length, so this takes the
      // splice branch — no hole, and the same result `push` would give.
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 4])
    })
  })

  describe('update()', () => {
    it('should replace all items that matches the predicate and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { update }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        update(a => a % 2 === 1, 0)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([0, 2, 0])
    })

    it('should pass two parameters to the predicate, iterated element and new one', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { update }]] = hook.result.current
      const calls: unknown[][] = []

      await hook.act(() => {
        update((...args: [number, number]) => {
          calls.push([...args])
          return false
        }, 0)
      })

      expect(calls[0][0]).toBe(1)
      expect(calls[0][1]).toBe(0)
      expect(calls[0].length).toBe(2)
    })

    it('re-renders with a fresh array even when nothing matched', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [firstList, { update }]] = hook.result.current

      await hook.act(() => {
        update(() => false, 0)
      })

      // Upstream maps unconditionally: contents are unchanged, but the list is
      // a new array and the component re-rendered.
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 2, 3])
      expect(hook.result.current[1][0]).not.toBe(firstList)
    })
  })

  describe('updateFirst()', () => {
    it('should replace first items that matches the predicate and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { updateFirst }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        updateFirst(a => a % 2 === 1, 0)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([0, 2, 3])
    })

    it('should pass two parameters to the predicate, iterated element and new one', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { updateFirst }]] = hook.result.current
      const calls: unknown[][] = []

      await hook.act(() => {
        updateFirst((...args: [number, number]) => {
          calls.push([...args])
          return false
        }, 0)
      })

      expect(calls[0].length).toBe(2)
      expect(calls[0][0]).toBe(1)
      expect(calls[0][1]).toBe(0)
    })

    it('does nothing — and does not re-render — when the predicate misses', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [firstList, { updateFirst }]] = hook.result.current

      await hook.act(() => {
        updateFirst(() => false, 0)
      })

      // Upstream guards with `index >= 0 && actions.updateAt(…)`, so a miss is
      // an absence by construction: no dispatch, no new array.
      expect(hook.result.current[0]).toBe(1)
      expect(hook.result.current[1][0]).toBe(firstList)
    })
  })

  describe('upsert()', () => {
    it('should replace first item that matches the predicate and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { upsert }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        upsert(a => a === 1, 0)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([0, 2, 3])
    })

    it('otherwise should push it to the list and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { upsert }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        upsert(a => a === 5, 0)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 0])
    })

    it('should pass two parameters to the predicate, iterated element and new one', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { upsert }]] = hook.result.current
      const calls: unknown[][] = []

      await hook.act(() => {
        upsert((...args: [number, number]) => {
          calls.push([...args])
          return false
        }, 0)
      })

      expect(calls[0].length).toBe(2)
      expect(calls[0][0]).toBe(1)
      expect(calls[0][1]).toBe(0)
    })
  })

  describe('sort()', () => {
    it('should sort the list with given comparator and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { sort }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        sort((a, b) => (a === b ? 0 : a < b ? 1 : -1))
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([3, 2, 1])
    })

    it('should use default array`s sorting function of called without parameters', async () => {
      const hook = await renderList([2, 3, 1])
      const [, [, { sort }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        sort()
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 2, 3])
    })
  })

  describe('filter()', () => {
    it('should filter the list with given predicate and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { filter }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        filter(val => val % 2 === 1)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 3])
    })

    it('should pass three parameters to the predicate, iterated element, it`s index and filtered array', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [list, { filter }]] = hook.result.current
      const calls: unknown[][] = []

      // The declared `filter` callback has optional `index` / `array`, so the
      // probe declares exactly that signature — a `(...args: [number, number,
      // number[]])` rest tuple is *not* assignable to it (TS2345, caught by the
      // throwaway-project typecheck of this file).
      await hook.act(() => {
        filter((value: number, index?: number, array?: number[]) => {
          calls.push([value, index, array])
          return false
        })
      })

      expect(calls[0].length).toBe(3)
      expect(calls[0][0]).toBe(1)
      expect(calls[0][1]).toBe(0)
      expect(calls[0][2]).toEqual(list)
    })

    it('forwards `thisArg` to the native filter', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { filter }]] = hook.result.current

      await hook.act(() => {
        filter(function (this: { keep: number }, value: number) {
          return value === this.keep
        }, { keep: 2 })
      })

      expect(hook.result.current[1][0]).toEqual([2])
    })
  })

  describe('removeAt()', () => {
    it('should remove item at given index and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { removeAt }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        removeAt(1)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 3])
    })

    it('should do nothing if index is out of array length, although it should cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { removeAt }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        removeAt(5)
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([1, 2, 3])
    })
  })

  describe('remove()', () => {
    it('should be a ref to removeAt', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { remove, removeAt }]] = hook.result.current

      expect(remove).toBe(removeAt)
    })

    it('is the last own key of the action object, as upstream leaves it', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, actions]] = hook.result.current

      // Upstream assigns `remove` *after* building the object, so the spread
      // that keeps `remove === removeAt` also keeps the key order.
      expect(Object.keys(actions).at(-1)).toBe('remove')
    })

    it('removes through the alias', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { remove }]] = hook.result.current

      await hook.act(() => {
        remove(0)
      })

      expect(hook.result.current[1][0]).toEqual([2, 3])
    })
  })

  describe('clear()', () => {
    it('should clear the list and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { clear }]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        clear()
      })
      expect(hook.result.current[0]).toBe(2)
      expect(hook.result.current[1][0]).toEqual([])
    })
  })

  describe('reset()', () => {
    it('should reset list to initial values and cause re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { set, reset }]] = hook.result.current

      await hook.act(() => {
        set([1, 2, 3, 4, 6, 7, 8])
      })
      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 4, 6, 7, 8])

      expect(hook.result.current[0]).toBe(2)
      await hook.act(() => {
        reset()
      })
      expect(hook.result.current[0]).toBe(3)
      expect(hook.result.current[1][0]).toEqual([1, 2, 3])
    })

    it('targets the FIRST render\'s initial list, not a later argument', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, { set, reset }]] = hook.result.current

      await hook.act(() => {
        set([9])
      })
      await hook.rerender([4, 5])
      expect(hook.result.current[1][0]).toEqual([9])

      await hook.act(() => {
        reset()
      })

      // The actions are memoised with an empty dependency array, so `reset`
      // closes over the first render's argument — upstream's behaviour.
      expect(hook.result.current[1][0]).toEqual([1, 2, 3])
    })

    it('resets to a copy, unlike the first render which aliases the argument', async () => {
      const initial = [1, 2, 3]
      const hook = await renderList(initial)
      const [, [, { set, reset }]] = hook.result.current

      // Upstream does not copy the initial list: on the first render the
      // returned array IS the caller's array.
      expect(hook.result.current[1][0]).toBe(initial)

      await hook.act(() => {
        set([9])
      })
      await hook.act(() => {
        reset()
      })

      expect(hook.result.current[1][0]).toEqual([1, 2, 3])
      expect(hook.result.current[1][0]).not.toBe(initial)
    })
  })

  describe('action identity and ref timing', () => {
    it('keeps the actions identical across mutations, re-renders and prop changes', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, actions]] = hook.result.current

      await hook.act(() => {
        actions.push(4)
      })
      expect(hook.result.current[1][1]).toBe(actions)

      await hook.rerender([7, 8])
      expect(hook.result.current[1][1]).toBe(actions)

      await hook.act(() => {
        actions.clear()
      })
      expect(hook.result.current[1][1]).toBe(actions)
    })

    it('lets two actions in one handler observe each other (the synchronous ref read)', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, actions]] = hook.result.current

      await hook.act(() => {
        actions.set([1, 2, 3, 4])
        // `upsert` reads `list.current`, which `set` has already written: it
        // finds 4 and replaces it. A `useState` port would read the stale
        // render value, miss, and push → [1, 2, 3, 4, 9].
        actions.upsert(item => item === 4, 9)
      })

      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 9])
    })

    it('batches the dispatches of two actions into one re-render', async () => {
      const hook = await renderList([1, 2, 3])
      const [, [, actions]] = hook.result.current

      expect(hook.result.current[0]).toBe(1)
      await hook.act(() => {
        actions.push(4)
        actions.push(5)
      })

      expect(hook.result.current[1][0]).toEqual([1, 2, 3, 4, 5])
      expect(hook.result.current[0]).toBe(2)
    })

    it('accepts a lazy initial factory', async () => {
      const hook = await renderList()
      const [, [, actions]] = hook.result.current

      expect(hook.result.current[1][0]).toEqual([])
      await hook.act(() => {
        actions.push(1)
      })
      expect(hook.result.current[1][0]).toEqual([1])
    })
  })

  it('drives a rendered component through its actions', async () => {
    function ListDemo() {
      const [list, { push, removeAt, clear }] = useList([1, 2])

      return (
        <div>
          <span>
            {'list: '}
            {list.join(',')}
          </span>
          <button onClick={() => push(3)}>Push</button>
          <button onClick={() => removeAt(0)}>Remove first</button>
          <button onClick={() => clear()}>Clear</button>
        </div>
      )
    }

    const screen = await render(<ListDemo />)

    await expect.element(screen.getByText('list: 1,2')).toBeVisible()
    await screen.getByRole('button', { name: 'Push' }).click()
    await expect.element(screen.getByText('list: 1,2,3')).toBeVisible()
    await screen.getByRole('button', { name: 'Remove first' }).click()
    await expect.element(screen.getByText('list: 2,3')).toBeVisible()
    await screen.getByRole('button', { name: 'Clear' }).click()
    await expect.element(screen.getByText('list:')).toBeVisible()
  })

  it('is SSR-safe — renders with no DOM work and leaves the globals untouched', () => {
    const snapshot = {
      window: globalThis.window,
      document: globalThis.document,
    }
    const seenInRender = { window: true, document: true }

    function SSRUseList() {
      const [list] = useList([1, 2])
      seenInRender.window = 'window' in globalThis
      seenInRender.document = 'document' in globalThis
      return <div>{list.length}</div>
    }

    // `renderToString` runs the first render — the `useRef` and `useUpdate`
    // only — with no DOM involved at all. A browser-mode file cannot *delete*
    // the globals to prove the negative (`window` / `document` are
    // non-configurable accessors on `Window` / `Document`), so this asserts the
    // render completes and both globals are byte-for-byte untouched.
    expect(renderToString(<SSRUseList />)).toContain('2')
    expect(seenInRender.window).toBe(true)
    expect(seenInRender.document).toBe(true)
    expect(globalThis.window).toBe(snapshot.window)
    expect(globalThis.document).toBe(snapshot.document)
  })
})
