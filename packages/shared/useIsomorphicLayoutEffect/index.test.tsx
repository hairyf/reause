import { useIsomorphicLayoutEffect as fromBarrel } from '@reause/shared'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { expect, expectTypeOf, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useIsomorphicLayoutEffect } from '../useIsomorphicLayoutEffect'
import { isClient } from '../utils'

/**
 * `useIsomorphicLayoutEffect` is react-use's six-line environment switch
 * (`source/react-use/src/useIsomorphicLayoutEffect.ts`): the export **is**
 * React's `useLayoutEffect` in the browser and React's `useEffect` on the
 * server, rather than a function that forwards to one of them.
 *
 * There is no upstream test file to mirror — react-use ships none for
 * `src/useIsomorphicLayoutEffect.ts` — so these cases are authored here.
 *
 * What is covered, and what is not: the whole value is chosen **once, when the
 * module is evaluated**, from `isClient` (`packages/shared/utils/index.tsx`).
 * The browser project can only ever observe the client arm, so that arm is
 * asserted directly (identity against React's own `useLayoutEffect`, plus the
 * ordering a layout effect produces against a passive effect), while the server
 * arm is *reasoned*, not tested: with `isClient === false` the same ternary
 * yields `useEffect`, and nothing in this repo loads the hook in a non-DOM realm
 * (the `exports` project's include list covers only `test/*.test.ts` and
 * `packages/skills/*.test.ts`). Faking the server arm by re-importing the module
 * with a patched global is deliberately not done: the module graph is cached per
 * environment and the result would not be justifiable.
 */

it('is React\'s own `useLayoutEffect` in the browser — the drop-in identity', () => {
  // Guard first: the two arms of the ternary are distinct functions in this
  // React build, so the identity below is not vacuous and a wrong arm cannot
  // pass it.
  expect(useEffect).not.toBe(useLayoutEffect)
  expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect)
  expect(useIsomorphicLayoutEffect).not.toBe(useEffect)
})

it('is the same reference through the module and through the `@reause/shared` barrel', () => {
  expect(fromBarrel).toBe(useIsomorphicLayoutEffect)
  expect(fromBarrel).toBe(useLayoutEffect)
})

it('is a value, not a wrapper function that calls React\'s hook', () => {
  // A wrapper — `(effect, deps) => useLayoutEffect(effect, deps)` — is its own
  // function: a different identity, and named after the export rather than
  // after React's hook. Reference identity is the whole contract; the name
  // assertions are the discriminating extra, since a wrapper satisfies
  // `toBeTypeOf('function')` happily.
  expect(useIsomorphicLayoutEffect).toBeTypeOf('function')
  expect(Object.is(useIsomorphicLayoutEffect, useLayoutEffect)).toBe(true)
  expect(useIsomorphicLayoutEffect.name).toBe(useLayoutEffect.name)
  expect(useIsomorphicLayoutEffect.name).not.toBe('useIsomorphicLayoutEffect')
})

it('measures the committed DOM before the passive effect — a layout effect, not a passive one', async () => {
  const log: string[] = []

  function Probe() {
    const boxRef = useRef<HTMLDivElement>(null)

    // Declared BEFORE the isomorphic hook on purpose: were the value
    // `useEffect`, both effects would be passive and would run in declaration
    // order, putting the isomorphic entry second. A layout effect runs before
    // every passive effect of the same commit, whatever the declaration order.
    useEffect(() => {
      log.push(`passive:${boxRef.current?.getBoundingClientRect().width}`)
    })

    useIsomorphicLayoutEffect(() => {
      log.push(`isomorphic:${boxRef.current?.getBoundingClientRect().width}`)
    })

    return <div ref={boxRef} style={{ width: '120px' }}>box</div>
  }

  const screen = await render(<Probe />)
  await expect.element(screen.getByText('box')).toBeVisible()

  const kinds = log.map(entry => entry.split(':')[0])
  // every isomorphic entry precedes the first passive one (StrictMode-safe: the
  // counts, not a fixed length, decide)
  expect(kinds[0]).toBe('isomorphic')
  expect(kinds.filter(kind => kind === 'isomorphic')).toHaveLength(kinds.indexOf('passive'))
  expect(kinds).toContain('passive')

  // the ref was attached and the box was laid out when the layout effect ran,
  // so the measurement taken there is real rather than 0/undefined
  const widths = log.map(entry => Number(entry.split(':')[1]))
  expect(widths.every(width => width > 0)).toBe(true)
  expect(new Set(widths).size).toBe(1)
})

it('behaves as React\'s own hook inside a component: one run per mount, cleanup on unmount', async () => {
  const events: string[] = []

  const { rerender, unmount } = await renderHook(() => {
    useIsomorphicLayoutEffect(() => {
      events.push('run')
      return () => {
        events.push('cleanup')
      }
    }, [])
  })

  expect(events).toEqual(['run'])

  // empty deps: a re-render with unchanged deps must not re-run the effect
  await rerender()
  expect(events).toEqual(['run'])

  await unmount()
  expect(events).toEqual(['run', 'cleanup'])
})

it('is decided by `isClient`, which is true in this realm — the client arm is the tested one', () => {
  // Anchors the reasoning about the untested server arm: `isClient` is the
  // module-load input that picks the arm, and in the browser realm it is true,
  // which is why the assertions above must see `useLayoutEffect`.
  expect(isClient).toBe(true)
  expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect)
})

it('types: identical to React\'s own effect signatures — the ternary needs no cast', () => {
  // Both arms have the same signature in React's types, which is exactly why
  // `isClient ? useLayoutEffect : useEffect` type-checks with no `as` — the
  // assertion here pins that, so a future divergence surfaces as a failure
  // rather than as a silently added cast.
  expectTypeOf(useIsomorphicLayoutEffect).toEqualTypeOf<typeof useLayoutEffect>()
  expectTypeOf(useIsomorphicLayoutEffect).toEqualTypeOf<typeof useEffect>()
})
