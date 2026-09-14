import type Sortable from 'sortablejs'
import type { UseSortableOptions } from '../useSortable'
import SortableJs from 'sortablejs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { insertNodeAt, moveArrayElement, removeNode, useSortable } from '../useSortable'

/** Minimal sortablejs event for driving the internal `onUpdate` handler. */
function makeSortableEvent(
  item: HTMLElement,
  from: HTMLElement,
  oldIndex: number,
  newIndex: number,
): Sortable.SortableEvent {
  return { item, from, oldIndex, newIndex } as unknown as Sortable.SortableEvent
}

/** Read the internal `onUpdate` handler out of a live instance. */
function getOnUpdate(sortable: Sortable): (e: Sortable.SortableEvent) => void {
  return sortable.option('onUpdate') as unknown as (e: Sortable.SortableEvent) => void
}

describe('useSortable', () => {
  let container: HTMLDivElement
  let items: HTMLDivElement[]

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    items = [0, 1, 2].map((i) => {
      const item = document.createElement('div')
      item.textContent = `item-${i}`
      container.appendChild(item)
      return item
    })
  })

  afterEach(() => {
    container.remove()
  })

  it('should be defined', () => {
    expect(useSortable).toBeDefined()
  })

  describe('insertNodeAt', () => {
    it('should insert an element at the given index', () => {
      const extra = document.createElement('div')
      insertNodeAt(container, extra, 1)

      expect(container.children[1]).toBe(extra)
      expect(container.children.length).toBe(4)
    })

    it('should append when the index is out of range', () => {
      const extra = document.createElement('div')
      insertNodeAt(container, extra, 99)

      expect(container.children[3]).toBe(extra)
    })
  })

  describe('removeNode', () => {
    it('should remove a node from its parent', () => {
      removeNode(items[1])

      expect(container.children.length).toBe(2)
      expect(container.contains(items[1])).toBe(false)
    })

    it('should be a no-op for a detached node', () => {
      const detached = document.createElement('div')
      expect(() => removeNode(detached)).not.toThrow()
    })
  })

  describe('moveArrayElement', () => {
    it('should return a new array with the element moved forward', () => {
      const list = ['a', 'b', 'c']
      const result = moveArrayElement(list, 0, 2)

      expect(result).toEqual(['b', 'c', 'a'])
    })

    it('should return a new array with the element moved backward', () => {
      const list = ['a', 'b', 'c']
      const result = moveArrayElement(list, 2, 0)

      expect(result).toEqual(['c', 'a', 'b'])
    })

    it('should never mutate the input array', () => {
      const list = ['a', 'b', 'c']
      const snapshot = [...list]
      const result = moveArrayElement(list, 0, 2)

      expect(list).toEqual(snapshot)
      expect(result).not.toBe(list)
    })

    it('should return an unchanged copy when `to` is out of range', () => {
      const list = ['a', 'b', 'c']
      const result = moveArrayElement(list, 0, 3)

      expect(result).toEqual(['a', 'b', 'c'])
      expect(result).not.toBe(list)
    })

    it('should return an unchanged copy when `to` is negative', () => {
      const list = ['a', 'b', 'c']
      const result = moveArrayElement(list, 0, -1)

      expect(result).toEqual(['a', 'b', 'c'])
      expect(result).not.toBe(list)
    })

    it('should perform the DOM fixup when an event is provided', () => {
      const list = ['a', 'b', 'c']
      // sortablejs moved items[0] in the DOM; the fixup restores the node to
      // `from` inside `e.from` while the array carries the reorder
      items[0].remove()
      const event = makeSortableEvent(items[0], container, 0, 2)
      const result = moveArrayElement(list, 0, 2, event)

      expect(result).toEqual(['b', 'c', 'a'])
      expect(list).toEqual(['a', 'b', 'c'])
      expect(container.children[0]).toBe(items[0])
      expect(container.children.length).toBe(3)
    })

    it('should accept an explicit null event', () => {
      const list = ['a', 'b', 'c']
      expect(moveArrayElement(list, 0, 1, null)).toEqual(['b', 'a', 'c'])
    })
  })

  describe('start', () => {
    it('should create the instance on mount', async () => {
      const { unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c']))

      expect(SortableJs.get(container)).toBeDefined()

      unmount()
    })

    it('should not create a second instance when already started', async () => {
      const { result, unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c']))
      const first = SortableJs.get(container)

      result.current.start()

      expect(SortableJs.get(container)).toBe(first)

      unmount()
    })

    it('should recreate the instance after stop()', async () => {
      const { result, unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c']))

      expect(SortableJs.get(container)).toBeDefined()

      result.current.stop()
      // sortablejs returns null from Sortable.get() after destroy()
      expect(SortableJs.get(container)).toBeFalsy()

      result.current.start()
      expect(SortableJs.get(container)).toBeDefined()

      unmount()
    })

    it('should destroy the instance on unmount', async () => {
      const { unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c']))

      expect(SortableJs.get(container)).toBeDefined()

      unmount()

      expect(SortableJs.get(container)).toBeFalsy()
    })

    it('should accept a React ref object', async () => {
      const target = { current: container }
      const { unmount } = await renderHook(() => useSortable(target, ['a', 'b', 'c']))

      expect(SortableJs.get(container)).toBeDefined()

      unmount()
    })

    it('should accept a selector string', async () => {
      container.id = 'sortable-selector-el'
      const { unmount } = await renderHook(() => useSortable('#sortable-selector-el', ['a', 'b', 'c']))

      expect(SortableJs.get(container)).toBeDefined()

      unmount()
    })

    it('should re-query the DOM on every start()', async () => {
      container.id = 'sortable-late-el'
      const late = document.createElement('div')
      late.id = 'sortable-late-el-target'
      document.body.appendChild(late)

      try {
        const { result, unmount } = await renderHook(() => useSortable('#sortable-late-el-target', ['a', 'b', 'c']))

        expect(SortableJs.get(late)).toBeDefined()
        result.current.stop()
        expect(SortableJs.get(late)).toBeFalsy()
        result.current.start()
        expect(SortableJs.get(late)).toBeDefined()

        unmount()
      }
      finally {
        late.remove()
      }
    })

    it('should stay a no-op when the target cannot be resolved', async () => {
      const { result, unmount } = await renderHook(() => useSortable('#does-not-exist-209', ['a', 'b', 'c']))

      expect(() => result.current.start()).not.toThrow()

      unmount()
    })
  })

  describe('stop', () => {
    it('should destroy the instance', async () => {
      const { result, unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c']))

      expect(SortableJs.get(container)).toBeDefined()

      result.current.stop()

      expect(SortableJs.get(container)).toBeFalsy()

      unmount()
    })
  })

  describe('option', () => {
    it('should get an option from the instance', async () => {
      const { result, unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c'], { animation: 150 }))

      expect(result.current.option('animation')).toBe(150)

      unmount()
    })

    it('should set an option on the instance', async () => {
      const { result, unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c']))

      expect(result.current.option('disabled')).toBe(false)

      result.current.option('disabled', true)

      expect(result.current.option('disabled')).toBe(true)
      expect(SortableJs.get(container)?.option('disabled')).toBe(true)

      unmount()
    })

    it('should be a safe no-op before start()', async () => {
      const { result, unmount } = await renderHook(() => useSortable('#missing-el-209', ['a', 'b', 'c']))

      expect(() => result.current.option('disabled', true)).not.toThrow()
      expect(result.current.option('disabled')).toBeUndefined()

      unmount()
    })
  })

  describe('onUpdate', () => {
    it('should hand the reordered array to the caller', async () => {
      const onUpdate = vi.fn()
      const list = ['a', 'b', 'c']
      const { unmount } = await renderHook(() => useSortable({ current: container }, list, { onUpdate }))

      const sortable = SortableJs.get(container)!
      const event = makeSortableEvent(items[0], container, 0, 2)

      getOnUpdate(sortable)(event)

      expect(onUpdate).toHaveBeenCalledTimes(1)
      const [newList, passedEvent] = onUpdate.mock.calls[0] as [string[], Sortable.SortableEvent]
      expect(newList).toEqual(['b', 'c', 'a'])
      expect(newList).not.toBe(list)
      expect(passedEvent).toBe(event)
      // the caller's list is never mutated
      expect(list).toEqual(['a', 'b', 'c'])

      unmount()
    })

    it('should reorder backwards too', async () => {
      const onUpdate = vi.fn()
      const { unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c'], { onUpdate }))

      const sortable = SortableJs.get(container)!
      getOnUpdate(sortable)(makeSortableEvent(items[2], container, 2, 0))

      expect(onUpdate).toHaveBeenCalledWith(['c', 'a', 'b'], expect.anything())

      unmount()
    })

    it('should not throw when no onUpdate is provided', async () => {
      const { unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c']))

      const sortable = SortableJs.get(container)!

      expect(() => getOnUpdate(sortable)(makeSortableEvent(items[0], container, 0, 2))).not.toThrow()

      unmount()
    })
  })

  describe('watchElement', () => {
    it('should reinitialize when the element identity changes', async () => {
      const second = document.createElement('div')
      document.body.appendChild(second)

      try {
        const { rerender, unmount } = await renderHook<
          { el: { current: HTMLElement | null } },
          ReturnType<typeof useSortable>
        >(
          props => useSortable(props!.el, ['a', 'b', 'c'], { watchElement: true }),
          { initialProps: { el: { current: container } } },
        )

        const firstInstance = SortableJs.get(container)
        expect(firstInstance).toBeDefined()

        await rerender({ el: { current: second } })

        expect(SortableJs.get(container)).toBeFalsy()
        expect(SortableJs.get(second)).toBeDefined()
        expect(SortableJs.get(second)).not.toBe(firstInstance)

        unmount()
      }
      finally {
        second.remove()
      }
    })

    it('should keep the instance when the same element is re-rendered', async () => {
      const { rerender, unmount } = await renderHook<
        { el: { current: HTMLElement | null } },
        ReturnType<typeof useSortable>
      >(
        props => useSortable(props!.el, ['a', 'b', 'c'], { watchElement: true }),
        { initialProps: { el: { current: container } } },
      )

      const firstInstance = SortableJs.get(container)
      expect(firstInstance).toBeDefined()

      await rerender({ el: { current: container } })

      expect(SortableJs.get(container)).toBe(firstInstance)

      unmount()
    })

    it('should destroy the instance when the element becomes null', async () => {
      const { rerender, unmount } = await renderHook<
        { el: { current: HTMLElement | null } },
        ReturnType<typeof useSortable>
      >(
        props => useSortable(props!.el, ['a', 'b', 'c'], { watchElement: true }),
        { initialProps: { el: { current: container as HTMLElement | null } } },
      )

      expect(SortableJs.get(container)).toBeDefined()

      await rerender({ el: { current: null } })

      expect(SortableJs.get(container)).toBeFalsy()

      unmount()
    })

    it('should follow the element prop when watchElement is false', async () => {
      const second = document.createElement('div')
      document.body.appendChild(second)

      try {
        const { result, rerender, unmount } = await renderHook<
          { el: { current: HTMLElement | null } },
          ReturnType<typeof useSortable>
        >(
          props => useSortable(props!.el, ['a', 'b', 'c']),
          { initialProps: { el: { current: container } } },
        )

        expect(SortableJs.get(container)).toBeDefined()

        // the mount effect re-runs because the resolved element changed, so the
        // instance follows the new element without a manual start()
        await rerender({ el: { current: second } })

        expect(SortableJs.get(second)).toBeDefined()
        expect(SortableJs.get(container)).toBeFalsy()

        result.current.start()
        expect(SortableJs.get(second)).toBeDefined()

        unmount()
      }
      finally {
        second.remove()
      }
    })

    it('should apply extra options alongside the default handler', async () => {
      const options: UseSortableOptions<string> = { watchElement: true, animation: 200, onUpdate: vi.fn() }
      const { result, unmount } = await renderHook(() => useSortable({ current: container }, ['a', 'b', 'c'], options))

      expect(result.current.option('animation')).toBe(200)
      expect(SortableJs.get(container)).toBeDefined()

      unmount()
    })

    it('should initialize a selector target on mount when watchElement is enabled', async () => {
      container.id = 'sortable-watch-string'
      const { unmount } = await renderHook(() => useSortable('#sortable-watch-string', ['a', 'b', 'c'], { watchElement: true }))

      expect(SortableJs.get(container)).toBeDefined()

      unmount()
    })

    it('should reinitialize when a ref-like target resolves to a new element', async () => {
      const second = document.createElement('div')
      document.body.appendChild(second)
      const target = { current: container }

      try {
        const { rerender, unmount } = await renderHook(() => useSortable(target, ['a', 'b', 'c'], { watchElement: true }))

        const firstInstance = SortableJs.get(container)
        expect(firstInstance).toBeDefined()

        // swap `.current` — only a per-render re-resolution notices the change
        target.current = second
        await rerender()

        expect(SortableJs.get(container)).toBeFalsy()
        expect(SortableJs.get(second)).toBeDefined()
        expect(SortableJs.get(second)).not.toBe(firstInstance)

        unmount()
      }
      finally {
        second.remove()
      }
    })

    it('should keep the instance on the mounted element when watchElement is false and the ref target swaps', async () => {
      const second = document.createElement('div')
      document.body.appendChild(second)
      const target = { current: container }

      try {
        const { result, rerender, unmount } = await renderHook(() => useSortable(target, ['a', 'b', 'c']))

        const firstInstance = SortableJs.get(container)
        expect(firstInstance).toBeDefined()

        // the mount effect keys on the ref object identity, so a `.current`
        // swap leaves the instance on the element resolved at mount
        target.current = second
        await rerender()

        expect(SortableJs.get(container)).toBe(firstInstance)
        expect(SortableJs.get(second)).toBeFalsy()

        // `start()` re-queries the target manually
        result.current.stop()
        result.current.start()
        expect(SortableJs.get(second)).toBeDefined()

        unmount()
      }
      finally {
        second.remove()
      }
    })
  })
})
