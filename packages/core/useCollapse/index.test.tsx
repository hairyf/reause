import type { CSSProperties, TransitionEvent as ReactTransitionEvent } from 'react'
import type { UseCollapseInput, UseCollapseReturnValue } from '../useCollapse'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import {
  getElementHeight,
  isMeasured,
  useCollapse,
} from '../useCollapse'

// Mirrors upstream
// `source/mantine/packages/@mantine/hooks/src/use-collapse/use-collapse.test.tsx`.
//
// The chromium page is shared across a test file, so every render is mounted by
// the test itself and the suites below never assert on an element they did not
// create.
//
// Two upstream assumptions are load-bearing here and were measured rather than
// assumed (a probe on this browser reported them): a block with `height: 0` that
// has no rendered children has `scrollHeight === 0`, which is how the pin's
// "cannot be measured" branch is reached, and a block wrapping a fixed-size
// child reports that child's height as `scrollHeight`, which is how the
// measured-height branch and the `getAutoHeightDuration` curve are reached.
const MEASURED_HEIGHT = 120

/** The pin's `getAutoHeightDuration` curve, restated for the assertions. */
function autoHeightDuration(height: number): number {
  const constant = height / 36
  return Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10)
}

/**
 * The measurement the pin's collapsed branch depends on: an element with
 * `height: 0` and `overflow: hidden` still reports its children's height
 * through `scrollHeight`, and reports `0` when it has none.
 */
function Collapsible({ collapse, height }: { collapse: UseCollapseReturnValue, height: number }) {
  return (
    <div data-testid="target" {...collapse.getCollapseProps()}>
      {height > 0 && <div style={{ height }} />}
    </div>
  )
}

/** Toggle harness: `expanded`/`height` change from outside via props. */
function Harness({ expanded, height, ...input }: UseCollapseInput & { height: number }) {
  const collapse = useCollapse({ ...input, expanded })
  return <Collapsible collapse={collapse} height={height} />
}

describe('useCollapse module surface', () => {
  it('exports the hook and the two helpers the pin exports', () => {
    expect(useCollapse).toBeTypeOf('function')
    expect(getElementHeight).toBeTypeOf('function')
    expect(isMeasured).toBeTypeOf('function')
  })

  it('re-exports the hook and both helpers from the @reause/core barrel', async () => {
    const core = await import('@reause/core')
    expect(core.useCollapse).toBe(useCollapse)
    expect(core.getElementHeight).toBe(getElementHeight)
    expect(core.isMeasured).toBe(isMeasured)
  })

  it('types: input, state union and the getCollapseProps contract', () => {
    expectTypeOf(useCollapse).parameter(0).toEqualTypeOf<UseCollapseInput>()
    expectTypeOf(useCollapse).returns.toEqualTypeOf<UseCollapseReturnValue>()
    expectTypeOf<UseCollapseReturnValue['state']>()
      .toEqualTypeOf<'entering' | 'entered' | 'exiting' | 'exited'>()
  })
})

describe('useCollapse state machine', () => {
  it('starts in `entered` when expanded=true', async () => {
    const { result } = await renderHook(() => useCollapse({ expanded: true }))
    expect(result.current.state).toBe('entered')
  })

  it('starts in `exited` when expanded=false', async () => {
    const { result } = await renderHook(() => useCollapse({ expanded: false }))
    expect(result.current.state).toBe('exited')
  })

  it('passes through `entering` and does not jump when a measurable element expands', async () => {
    const screen = await render(<Harness expanded={false} height={MEASURED_HEIGHT} />)
    const target = screen.getByTestId('target').element() as HTMLElement

    // collapsed: `display: none` is the `keepMounted: false` branch
    expect(target.style.display).toBe('none')
    expect(target.style.height).toBe('0px')
    expect(target.scrollHeight).toBe(0)

    await screen.rerender(<Harness expanded height={MEASURED_HEIGHT} />)

    // the node is already laid out (`display: block`) and measured while
    // `state` is still `entering`, so the height transition has something to
    // animate from
    await vi.waitFor(() => {
      expect(target.style.display).toBe('block')
    })
    expect(target.scrollHeight).toBe(MEASURED_HEIGHT)

    await vi.waitFor(() => {
      expect(target.style.height).toBe(`${MEASURED_HEIGHT}px`)
    })
    expect(target.style.willChange).toBe('height')
    // Chromium serialises the default `ease` timing function away, so the
    // inline value has no trailing keyword even though the pin writes it.
    expect(target.style.transition).toBe(
      `height ${autoHeightDuration(MEASURED_HEIGHT)}ms, opacity ${autoHeightDuration(MEASURED_HEIGHT)}ms`,
    )
  })

  it('passes through `exiting` while keeping the measured height, and settles in `exited`', async () => {
    const onTransitionStart = vi.fn()
    const onTransitionEnd = vi.fn()
    const screen = await render(
      <Harness
        expanded={false}
        height={MEASURED_HEIGHT}
        onTransitionEnd={onTransitionEnd}
        onTransitionStart={onTransitionStart}
      />,
    )
    const target = screen.getByTestId('target').element() as HTMLElement

    // expand for real first, so the collapse starts from an `entered` element
    // with a laid-out measured height
    await screen.rerender(
      <Harness
        expanded
        height={MEASURED_HEIGHT}
        onTransitionEnd={onTransitionEnd}
        onTransitionStart={onTransitionStart}
      />,
    )
    await vi.waitFor(() => {
      expect(target.style.height).toBe(`${MEASURED_HEIGHT}px`)
      expect(target.style.display).toBe('block')
    })
    target.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true, propertyName: 'height' }))
    await vi.waitFor(() => {
      expect(onTransitionEnd).toHaveBeenCalledTimes(1)
    })

    await screen.rerender(
      <Harness
        expanded={false}
        height={MEASURED_HEIGHT}
        onTransitionEnd={onTransitionEnd}
        onTransitionStart={onTransitionStart}
      />,
    )

    // the exit branch writes the transition styles while the element is still
    // laid out at its measured height, and only a later frame writes
    // `height: 0` for the transition to run towards. This is the branch that
    // would jump if it collapsed straight to `display: none`: the element stays
    // rendered throughout the transition and only the `transitionend` handler
    // reapplies the collapsed (and, with `keepMounted` off, `display: none`)
    // style. Measured, not assumed: after the expand settled, the enter branch's
    // `setStyles({})` had already cleared `display`, so the exit writes no
    // `display` at all and `display` reads empty here rather than `block`.
    await vi.waitFor(() => {
      expect(target.style.height).toBe('0px')
    })
    expect(target.style.display).not.toBe('none')
    expect(target.style.overflow).toBe('hidden')
    expect(target.style.transition).toBe(
      `height ${autoHeightDuration(MEASURED_HEIGHT)}ms, opacity ${autoHeightDuration(MEASURED_HEIGHT)}ms`,
    )
    // neither the expand (start) nor the collapse (start) was suppressed
    expect(onTransitionStart).toHaveBeenCalledTimes(2)

    // the collapse is not settled until a real `transitionend` arrives
    expect(onTransitionEnd).toHaveBeenCalledTimes(1)
    target.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true, propertyName: 'height' }))
    await vi.waitFor(() => {
      expect(onTransitionEnd).toHaveBeenCalledTimes(2)
    })
    expect(target.style.display).toBe('none')
    expect(target.style.overflow).toBe('hidden')
  })

  it('settles in `entered` when expanding an element that cannot be measured', async () => {
    const onTransitionEnd = vi.fn()
    const screen = await render(
      <Harness expanded={false} height={0} onTransitionEnd={onTransitionEnd} />,
    )
    const target = screen.getByTestId('target').element() as HTMLElement

    await screen.rerender(<Harness expanded height={0} onTransitionEnd={onTransitionEnd} />)

    await vi.waitFor(() => {
      expect(onTransitionEnd).toHaveBeenCalledTimes(1)
    })
    // the unmeasurable branch replaces the collapsed style with `{}` — measured
    // by probe: unlike a `display: none` box, the element was laid out for the
    // measure frame first, so this really is the `setStyles({})` branch
    expect(target.style.height).toBe('')
    expect(target.style.overflow).toBe('')
  })

  it('settles in `exited` when collapsing an element that cannot be measured', async () => {
    const onTransitionEnd = vi.fn()
    const screen = await render(<Harness expanded height={0} onTransitionEnd={onTransitionEnd} />)
    const target = screen.getByTestId('target').element() as HTMLElement

    await screen.rerender(<Harness expanded={false} height={0} onTransitionEnd={onTransitionEnd} />)

    await vi.waitFor(() => {
      expect(onTransitionEnd).toHaveBeenCalledTimes(1)
    })
    expect(target.style.height).toBe('0px')
    expect(target.style.overflow).toBe('hidden')
    expect(target.style.display).toBe('none')
  })

  it('calls onTransitionStart when expanded changes, and not on mount', async () => {
    const onTransitionStart = vi.fn()
    const { rerender } = await renderHook(
      (props?: { expanded: boolean }) =>
        useCollapse({ expanded: props?.expanded ?? false, onTransitionStart }),
      { initialProps: { expanded: false } },
    )

    expect(onTransitionStart).not.toHaveBeenCalled()

    await rerender({ expanded: true })

    expect(onTransitionStart).toHaveBeenCalledTimes(1)
  })

  it('does not call onTransitionStart when only its identity changes (no stale re-run)', async () => {
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = await renderHook(
      (props?: { expanded: boolean, onTransitionStart: () => void }) =>
        useCollapse({ expanded: props?.expanded ?? false, onTransitionStart: props?.onTransitionStart }),
      { initialProps: { expanded: false, onTransitionStart: first } },
    )

    await rerender({ expanded: false, onTransitionStart: second })

    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
  })

  it('calls the latest onTransitionStart after callback identity changes', async () => {
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = await renderHook(
      (props?: { expanded: boolean, onTransitionStart: () => void }) =>
        useCollapse({ expanded: props?.expanded ?? false, onTransitionStart: props?.onTransitionStart }),
      { initialProps: { expanded: false, onTransitionStart: first } },
    )

    await rerender({ expanded: false, onTransitionStart: second })
    await rerender({ expanded: true, onTransitionStart: second })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('ignores frames from a transition superseded before it settled', async () => {
    const onTransitionEnd = vi.fn()
    const screen = await render(
      <Harness expanded={false} height={MEASURED_HEIGHT} onTransitionEnd={onTransitionEnd} />,
    )
    const target = screen.getByTestId('target').element() as HTMLElement

    // a collapse that starts from an `entered` element, so it has a measured
    // height to exit from...
    await screen.rerender(
      <Harness expanded height={MEASURED_HEIGHT} onTransitionEnd={onTransitionEnd} />,
    )
    await vi.waitFor(() => {
      expect(target.style.height).toBe(`${MEASURED_HEIGHT}px`)
    })
    target.dispatchEvent(new TransitionEvent('transitionend', { bubbles: true, propertyName: 'height' }))
    await vi.waitFor(() => {
      expect(onTransitionEnd).toHaveBeenCalledTimes(1)
    })

    // ...is superseded by the collapse before it settles
    await screen.rerender(
      <Harness expanded={false} height={MEASURED_HEIGHT} onTransitionEnd={onTransitionEnd} />,
    )

    // give every frame of both transitions time to fire if the transition id
    // guard were missing
    await vi.waitFor(() => {
      expect(target.style.height).toBe('0px')
    }, { timeout: 1500 })
    await new Promise(resolve => setTimeout(resolve, 50))

    // the superseded expand contributed nothing: the collapse is the one that
    // got to write `height: 0`, and no aborted transition reported an end
    // (`display` is not asserted as `block` here: the settle above cleared the
    // inline style through the pin's `height === styles.height` branch)
    expect(target.style.display).not.toBe('none')
    expect(target.style.overflow).toBe('hidden')
    expect(onTransitionEnd).toHaveBeenCalledTimes(1)
  })

  it('does not call onTransitionEnd for a transition aborted by unmount', async () => {
    const onTransitionEnd = vi.fn()
    const screen = await render(
      <Harness expanded={false} height={MEASURED_HEIGHT} onTransitionEnd={onTransitionEnd} />,
    )

    await screen.rerender(
      <Harness expanded height={MEASURED_HEIGHT} onTransitionEnd={onTransitionEnd} />,
    )
    await screen.unmount()

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(onTransitionEnd).not.toHaveBeenCalled()
  })

  it('leaves no pending transition behind on an element that was never mounted', async () => {
    // The guard that makes the unmount case above hold is structural — the
    // `elementRef.current` check in every frame — so this suite is also
    // evidence *by construction* rather than only by observation. A hook with
    // no attached element never reaches its state updates at all.
    const onTransitionStart = vi.fn()
    const { rerender, unmount } = await renderHook(
      () => useCollapse({ expanded: false, onTransitionStart }),
    )

    await rerender()
    await unmount()

    expect(onTransitionStart).not.toHaveBeenCalled()
  })
})

describe('useCollapse keepMounted branches', () => {
  it('keepMounted: false (default) collapses with display: none', async () => {
    const screen = await render(<Harness expanded={false} height={MEASURED_HEIGHT} />)
    const target = screen.getByTestId('target').element() as HTMLElement

    expect(target.style.display).toBe('none')
    expect(target.style.height).toBe('0px')
    expect(target.style.overflow).toBe('hidden')
    // the node is still in the document — the hook itself never unmounts
    expect(target.isConnected).toBe(true)
    expect(target.style.boxSizing).toBe('border-box')
    // and `display: none` means it is dropped from the layout entirely
    expect(target.scrollHeight).toBe(0)
  })

  it('keepMounted: true collapses without display: none, keeping the box laid out', async () => {
    const screen = await render(<Harness expanded={false} height={MEASURED_HEIGHT} keepMounted />)
    const target = screen.getByTestId('target').element() as HTMLElement

    expect(target.style.display).toBe('')
    expect(target.style.height).toBe('0px')
    expect(target.style.overflow).toBe('hidden')
    expect(target.isConnected).toBe(true)
    // the difference between the two branches, measured rather than assumed: a
    // `display: none` box reports no scroll height, a laid-out `height: 0` box
    // still reports its content
    expect(target.scrollHeight).toBe(MEASURED_HEIGHT)
  })

  it('collapsed content is inert and hidden from assistive tech in both branches', async () => {
    for (const keepMounted of [false, true]) {
      const screen = await render(<Harness expanded={false} height={MEASURED_HEIGHT} keepMounted={keepMounted} />)
      const target = screen.getByTestId('target').element() as HTMLElement

      expect(target.getAttribute('aria-hidden'), `keepMounted=${keepMounted}`).toBe('true')
      expect(target.hasAttribute('inert'), `keepMounted=${keepMounted}`).toBe(true)
      // unmount before the next iteration, so the shared page holds exactly one
      // `target` and the locator cannot resolve to two elements
      await screen.unmount()
    }
  })
})

describe('useCollapse getCollapseProps contract', () => {
  it('returns the pin\'s full prop bundle when collapsed', async () => {
    const externalRef = { current: null as HTMLDivElement | null }
    const { result } = await renderHook(() =>
      useCollapse({ expanded: false, keepMounted: true }).getCollapseProps({ ref: externalRef }),
    )

    const props = result.current
    expect(props['aria-hidden']).toBe(true)
    expect(props.inert).toBe(true)
    expect(props.style.boxSizing).toBe('border-box')
    expect(props.style.height).toBe(0)
    expect(props.style.overflow).toBe('hidden')
    expect(props.style.display).toBeUndefined()
    expect(props.onTransitionEnd).toBeTypeOf('function')
    expect(props.ref).toBeTypeOf('function')

    // the merged ref really assigns the element, and detaches it on cleanup
    const element = document.createElement('div')
    props.ref(element)
    expect(externalRef.current).toBe(element)
  })

  it('returns the pin\'s full prop bundle when expanded', async () => {
    const { result } = await renderHook(() => useCollapse({ expanded: true }).getCollapseProps())

    const props = result.current
    expect(props['aria-hidden']).toBe(false)
    expect(props.inert).toBe(false)
    expect(props.style.boxSizing).toBe('border-box')
    expect(props.style.height).toBeUndefined()
    expect(props.style.display).toBeUndefined()
  })

  it('honours getCollapseProps(input): the caller style is applied first, the internal style wins', async () => {
    const externalRef = { current: null as HTMLDivElement | null }
    const callerStyle: CSSProperties = { color: 'red', height: '5px' }
    const { result } = await renderHook(() =>
      useCollapse({ expanded: false })
        .getCollapseProps({ ref: externalRef, style: callerStyle }),
    )

    const props = result.current
    // the caller's own declarations survive
    expect(props.style.color).toBe('red')
    // ...and the hook's collapsed style overrides the conflicting one
    expect(props.style.height).toBe(0)
  })

  it('merges the caller ref alongside the internal one, for both ref shapes', async () => {
    const objectRef = { current: null as HTMLDivElement | null }
    const callbackRef = vi.fn()
    const { result } = await renderHook(() =>
      useCollapse({ expanded: true }).getCollapseProps({ ref: callbackRef }),
    )

    const merged = result.current.ref as (node: HTMLDivElement | null) => void
    const element = document.createElement('div')
    merged(element)
    expect(callbackRef).toHaveBeenCalledWith(element)
    expect(objectRef.current).toBeNull()

    // a hook with no external ref still assigns its own
    const { result: plain } = await renderHook(() => useCollapse({ expanded: true }))
    const plainMerged = plain.current.getCollapseProps().ref as (node: HTMLDivElement | null) => void
    expect(() => plainMerged(element)).not.toThrow()
  })

  it('drives the state machine through the returned onTransitionEnd handler', async () => {
    const onTransitionEnd = vi.fn()
    const { result } = await renderHook(
      (props?: { expanded: boolean }) =>
        useCollapse({ expanded: props?.expanded ?? false, onTransitionEnd }),
      { initialProps: { expanded: true } },
    )

    // a transitionend for another property, or from another target, is ignored.
    // The handler is typed for React's synthetic event, so the native
    // `TransitionEvent` the browser test can construct is cast into it — the
    // branch under test only reads `target` / `propertyName`.
    result.current.getCollapseProps().onTransitionEnd(
      new TransitionEvent('transitionend', { bubbles: true, propertyName: 'opacity' }) as unknown as ReactTransitionEvent<Element>,
    )
    expect(onTransitionEnd).not.toHaveBeenCalled()
    expect(result.current.state).toBe('entered')
  })
})

describe('useCollapse helpers', () => {
  it('getElementHeight returns scrollHeight, or the string `auto` with no element', () => {
    const ref = { current: null as HTMLElement | null }
    expect(getElementHeight(ref)).toBe('auto')

    const element = document.createElement('div')
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 42 })
    ref.current = element
    expect(getElementHeight(ref)).toBe(42)
  })

  it('isMeasured accepts only a number greater than zero', () => {
    expect(isMeasured(120)).toBe(true)
    expect(isMeasured(0)).toBe(false)
    expect(isMeasured(-1)).toBe(false)
    expect(isMeasured(Number.NaN)).toBe(false)
    expect(isMeasured('auto')).toBe(false)
    expect(isMeasured('120')).toBe(false)
  })

  it('derives the transition duration from the height curve', async () => {
    // The pin's formula, applied to the height the element actually reports.
    // Asserted through the observable `transition` style because
    // `getAutoHeightDuration` is private upstream and stays private here.
    const expected = autoHeightDuration
    // sanity: the curve is not the identity, so the assertion below can fail
    expect(expected(MEASURED_HEIGHT)).toBe(249)
    expect(expected(MEASURED_HEIGHT)).not.toBe(MEASURED_HEIGHT)

    const screen = await render(<Harness expanded={false} height={MEASURED_HEIGHT} />)
    await screen.rerender(<Harness expanded height={MEASURED_HEIGHT} />)
    const target = screen.getByTestId('target').element() as HTMLElement

    // Chromium serialises the default `ease` timing function away, so the
    // inline value carries no trailing keyword even though the pin writes one.
    await vi.waitFor(() => {
      expect(target.style.transition).toBe(
        `height ${expected(MEASURED_HEIGHT)}ms, opacity ${expected(MEASURED_HEIGHT)}ms`,
      )
    })
  })

  it('explicit transitionDuration replaces the curve verbatim', async () => {
    const screen = await render(
      <Harness expanded={false} height={MEASURED_HEIGHT} transitionDuration={200} />,
    )
    await screen.rerender(<Harness expanded height={MEASURED_HEIGHT} transitionDuration={200} />)
    const target = screen.getByTestId('target').element() as HTMLElement

    await vi.waitFor(() => {
      expect(target.style.transition).toBe('height 200ms, opacity 200ms')
    })
    // ...deliberately not the curve's 249ms
    expect(target.style.transition).not.toContain('249ms')
  })

  it('returns 0 for a string height, which is what makes the unmeasurable branch instant', () => {
    // The `0` return is not directly observable — `getElementHeight` returns
    // `'auto'` whenever there is no attached element, and the frame checks
    // `elementRef.current` before it ever asks for a duration, so the string
    // branch is reached only in the gap between attach and measure. What *is*
    // observable is the pin's contract that an unmeasurable height settles
    // immediately with no transition style; that is covered by the state-machine
    // suite above. Here the two public helpers pin the inputs of that branch.
    expect(getElementHeight({ current: null })).toBe('auto')
    expect(isMeasured(getElementHeight({ current: null }))).toBe(false)
  })

  it('honours a custom transitionTimingFunction', async () => {
    const screen = await render(
      <Harness expanded={false} height={MEASURED_HEIGHT} transitionTimingFunction="linear" />,
    )
    await screen.rerender(
      <Harness expanded height={MEASURED_HEIGHT} transitionTimingFunction="linear" />,
    )
    const target = screen.getByTestId('target').element() as HTMLElement

    await vi.waitFor(() => {
      expect(target.style.transition).toMatch(/, opacity \d+ms linear$/)
    })
  })

  it('does not call onTransitionStart when transitionDuration is 0', async () => {
    const onTransitionStart = vi.fn()
    const { rerender } = await renderHook(
      (props?: { expanded: boolean }) =>
        useCollapse({ expanded: props?.expanded ?? false, transitionDuration: 0, onTransitionStart }),
      { initialProps: { expanded: false } },
    )

    await rerender({ expanded: true })

    expect(onTransitionStart).not.toHaveBeenCalled()
  })
})
