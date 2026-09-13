import { StrictMode, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useTrackedEffect } from '../useTrackedEffect'

it('runs on mount and reports every dependency index, not `undefined`', async () => {
  // Measured from the pin: `previousDepsRef.current` starts `undefined`, and
  // `diffTwoDeps`'s fallback branch enumerates the *current* list — so the first
  // run reports `[0, 1, …]`. It is never `undefined`; the effect's parameters
  // are optional in the type only.
  const seen: { changes?: number[], previousDeps?: unknown[], currentDeps?: unknown[] }[] = []
  const stable = { value: 1 }
  const first = { a: 0, b: 'x', c: stable }

  const { unmount } = await renderHook((p: typeof first = first) => {
    useTrackedEffect((changes, previousDeps, currentDeps) => {
      seen.push({ changes, previousDeps, currentDeps })
    }, [p.a, p.b, p.c])
  })

  expect(seen).toHaveLength(1)
  expect(seen[0].changes).toEqual([0, 1, 2])
  expect(seen[0].previousDeps).toBeUndefined()
  expect(seen[0].currentDeps).toHaveLength(3)
  expect(seen[0].currentDeps?.[2]).toBe(stable)

  await unmount()
})

it('reports only the indexes that changed, and does not re-run when nothing did', async () => {
  const seen: (number[] | undefined)[] = []
  const first = { a: 0, b: 'x' }

  const { rerender, unmount } = await renderHook((p: typeof first = first) => {
    useTrackedEffect((changes) => {
      seen.push(changes)
    }, [p.a, p.b])
  })

  expect(seen).toEqual([[0, 1]])

  // identical values → React skips the effect entirely, so nothing is reported
  await rerender({ a: 0, b: 'x' })
  expect(seen).toEqual([[0, 1]])

  await rerender({ a: 1, b: 'x' })
  expect(seen).toEqual([[0, 1], [0]])

  await rerender({ a: 1, b: 'y' })
  expect(seen).toEqual([[0, 1], [0], [1]])

  // two of three moved → ascending indexes
  await rerender({ a: 2, b: 'z' })
  expect(seen).toEqual([[0, 1], [0], [1], [0, 1]])

  await unmount()
})

it('passes the previous run\'s deps as the second argument and this run\'s as the third', async () => {
  // The capture order is load bearing: the pin reads `previousDepsRef.current`
  // *before* overwriting it. Capturing after the assignment would hand the effect
  // its own current deps as "previous".
  const seen: { changes?: number[], previousDeps?: unknown[], currentDeps?: unknown[] }[] = []
  const first = { a: 1, b: 2 }

  const { rerender, unmount } = await renderHook((p: typeof first = first) => {
    useTrackedEffect((changes, previousDeps, currentDeps) => {
      seen.push({ changes, previousDeps, currentDeps })
    }, [p.a, p.b])
  })

  expect(seen[0].previousDeps).toBeUndefined()
  expect(seen[0].currentDeps).toEqual([1, 2])

  await rerender({ a: 9, b: 2 })
  expect(seen[1].changes).toEqual([0])
  expect(seen[1].previousDeps).toEqual([1, 2])
  expect(seen[1].currentDeps).toEqual([9, 2])

  await rerender({ a: 9, b: 8 })
  expect(seen[2].changes).toEqual([1])
  // the immediately preceding run's deps, not the first run's
  expect(seen[2].previousDeps).toEqual([9, 2])
  expect(seen[2].currentDeps).toEqual([9, 8])

  await unmount()
})

it('compares with `Object.is`: a `NaN` dep that stays `NaN` is not reported', async () => {
  // `NaN !== NaN`, so this is the discriminator between the pin's `Object.is`
  // and a plausible `!==` rewrite: the effect still re-runs (React compares with
  // `Object.is` too) but index 0 must not appear in `changes`.
  const seen: (number[] | undefined)[] = []
  const first = { a: Number.NaN, b: 0 }

  const { rerender, unmount } = await renderHook((p: typeof first = first) => {
    useTrackedEffect((changes) => {
      seen.push(changes)
    }, [p.a, p.b])
  })

  expect(seen).toEqual([[0, 1]])

  await rerender({ a: Number.NaN, b: 1 })
  expect(seen).toEqual([[0, 1], [1]])

  await rerender({ a: 2, b: 1 })
  expect(seen).toEqual([[0, 1], [1], [0]])

  await unmount()
})

it('treats `+0` and `-0` as different, because `Object.is` does', async () => {
  // The other side of the same coin: `0 === -0` is true, so a `!==` rewrite
  // would report an empty list here while React still re-runs the effect.
  const seen: (number[] | undefined)[] = []
  const first = { a: 0, b: 0 }

  const { rerender, unmount } = await renderHook((p: typeof first = first) => {
    useTrackedEffect((changes) => {
      seen.push(changes)
    }, [p.a, p.b])
  })

  expect(seen).toEqual([[0, 1]])

  await rerender({ a: -0, b: 0 })
  expect(seen).toEqual([[0, 1], [0]])

  await rerender({ a: -0, b: -0 })
  expect(seen).toEqual([[0, 1], [0], [1]])

  await unmount()
})

it('compares by reference: a mutated object with a stable identity is not reported', async () => {
  const seen: (number[] | undefined)[] = []
  const obj = { value: 0 }
  const first = { obj, n: 0 }

  const { rerender, unmount } = await renderHook((p: typeof first = first) => {
    useTrackedEffect((changes) => {
      seen.push(changes)
    }, [p.obj, p.n])
  })

  expect(seen).toEqual([[0, 1]])

  obj.value = 99
  // contents changed, identity did not → React compares deps by `Object.is` and
  // skips the effect
  await rerender({ obj, n: 0 })
  expect(seen).toEqual([[0, 1]])

  // force the effect to run through the other dep; index 0 is still not reported
  await rerender({ obj, n: 1 })
  expect(seen).toEqual([[0, 1], [1]])

  await unmount()
})

it('a deps array whose size changes: React only compares the shared prefix', async () => {
  // Read from React's own `areHookInputsEqual`: the loop stops at the shorter
  // array and returns `true` when that shared prefix is equal, so a size change
  // by itself is only a dev error — it does not re-run the effect. When a shared
  // element does change, `diffTwoDeps` iterates the *previous* list, so a shrink
  // can report an index the current deps do not have, and a grow never reports
  // the added indexes.
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  try {
    const seen: { changes?: number[], previousDeps?: unknown[], currentDeps?: unknown[] }[] = []
    const first = { deps: [1, 2, 3] as number[] }

    const { rerender, unmount } = await renderHook((p: { deps: number[] } = first) => {
      useTrackedEffect((changes, previousDeps, currentDeps) => {
        seen.push({ changes, previousDeps, currentDeps })
      }, p.deps)
    })

    expect(seen).toHaveLength(1)
    expect(seen[0].changes).toEqual([0, 1, 2])

    // shrink, with index 1 changed too → index 2 exists in the previous list
    // only, and is still reported
    await rerender({ deps: [1, 9] })
    expect(seen).toHaveLength(2)
    expect(seen[1].changes).toEqual([1, 2])
    expect(seen[1].currentDeps).toEqual([1, 9])

    // grow with an unchanged shared prefix → the effect does NOT run, only the
    // dev size warning fires
    await rerender({ deps: [1, 9, 3, 4] })
    expect(seen).toHaveLength(2)

    // grow again, this time with index 1 changed → re-runs, and the added
    // indexes 2 and 3 are not reported. `previousDeps` is the hook's own stored
    // list, which the skipped render never updated.
    await rerender({ deps: [1, 8, 3, 4] })
    expect(seen).toHaveLength(3)
    expect(seen[2].changes).toEqual([1])
    expect(seen[2].previousDeps).toEqual([1, 9])
    expect(seen[2].currentDeps).toEqual([1, 8, 3, 4])

    expect(errorSpy.mock.calls.map(call => String(call[0])).some(message => message.includes('changed size between renders'))).toBe(true)

    await unmount()
  }
  finally {
    errorSpy.mockRestore()
  }
})

it('forwards the effect\'s return value as the cleanup', async () => {
  const events: string[] = []
  const first = { a: 0 }

  const { rerender, unmount } = await renderHook((p: typeof first = first) => {
    useTrackedEffect((changes) => {
      events.push(`run:${changes?.join(',')}`)
      return () => events.push(`cleanup:${changes?.join(',')}`)
    }, [p.a])
  })

  expect(events).toEqual(['run:0'])

  await rerender({ a: 1 })
  expect(events).toEqual(['run:0', 'cleanup:0', 'run:0'])

  await unmount()
  expect(events).toEqual(['run:0', 'cleanup:0', 'run:0', 'cleanup:0'])
})

it('with `deps` omitted, runs after every render and always reports an empty list', async () => {
  // `deps` is `undefined`, so the stored list is `undefined` on every run and the
  // fallback branch enumerates nothing.
  const seen: (number[] | undefined)[] = []

  const { result, act, unmount } = await renderHook(() => {
    const [count, setCount] = useState(0)

    useTrackedEffect((changes) => {
      seen.push(changes)
    })

    return { count, setCount }
  })

  expect(seen).toEqual([[]])

  await act(() => result.current.setCount(1))
  expect(seen).toEqual([[], []])

  await act(() => result.current.setCount(2))
  expect(seen).toEqual([[], [], []])

  await unmount()
})

it('strictMode: the double-invoked mount effect reports [0, 1] and then []', async () => {
  // StrictMode runs the mount effect twice (setup → cleanup → setup) with the
  // same ref object. The first invocation sees `undefined` and reports every
  // index; the second sees the deps the first one stored and reports `[]`. This
  // is the observable footprint of "the stored deps are assigned during the
  // mount effect" — a fresh instance's first run is never `[]`.
  const seen: (number[] | undefined)[] = []

  function Probe() {
    useTrackedEffect((changes) => {
      seen.push(changes)
    }, [1, 2])

    return <span>probe</span>
  }

  const screen = await render(
    <StrictMode>
      <Probe />
    </StrictMode>,
  )

  await expect.element(screen.getByText('probe')).toBeVisible()
  expect(seen).toEqual([[0, 1], []])

  await screen.unmount()
})

it('sSR-safe: server rendering runs no effect and reports nothing', async () => {
  // Exercises the real server render path. The hook's render phase is `useRef`
  // alone, so the first render reads neither `window` nor `document` and React
  // reports nothing. (A browser-mode test cannot prove a global is *absent*; it
  // proves the render path is clean.)
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  try {
    const seen: (number[] | undefined)[] = []

    function Probe() {
      useTrackedEffect((changes) => {
        seen.push(changes)
      }, [1, 2])

      return <span>probe</span>
    }

    const html = renderToString(<Probe />)
    const messages = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .map(call => call.map(String).join(' '))

    expect(html).toContain('probe')
    expect(seen).toEqual([])
    expect(messages).toEqual([])
  }
  finally {
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  }
})
