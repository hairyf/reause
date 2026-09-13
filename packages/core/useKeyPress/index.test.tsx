import type { KeyPressEvent, KeyPressFilter, KeyType } from '../useKeyPress'
import type { KeyFilter as KeyStrokeFilter } from '../useKeyStroke'
import { useRef } from 'react'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useKeyPress } from '../useKeyPress'

interface KeyEventInit extends KeyboardEventInit {
  /** `keyCode` is not part of `KeyboardEventInit` (deprecated API) — pinned below. */
  keyCode?: number
}

/**
 * Build a keyboard event with an explicit `keyCode`.
 *
 * `keyCode` is a deprecated getter on `KeyboardEvent.prototype` and cannot be
 * passed through `KeyboardEventInit`, so it is pinned as an own property
 * shadowing the getter — exactly what `@testing-library/dom`'s `fireEvent`
 * does, and what upstream ahooks' suite relies on (`fireEvent.keyDown(document,
 * { key: 'c', keyCode: 67 })`).
 */
function keyEvent(type: KeyPressEvent, init: KeyEventInit): KeyboardEvent {
  const { keyCode, ...rest } = init
  const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...rest })
  if (keyCode !== undefined)
    Object.defineProperty(event, 'keyCode', { value: keyCode })
  return event
}

/** Dispatch a `keydown` on `document`, which bubbles to the default `window` target. */
function press(init: KeyEventInit, target: EventTarget = document): KeyboardEvent {
  const event = keyEvent('keydown', init)
  target.dispatchEvent(event)
  return event
}

/** Dispatch a `keyup` on `document`, which bubbles to the default `window` target. */
function release(init: KeyEventInit, target: EventTarget = document): KeyboardEvent {
  const event = keyEvent('keyup', init)
  target.dispatchEvent(event)
  return event
}

/** An element attached to the document, so it is a real event target. */
function createTarget(tag = 'div'): HTMLElement {
  const el = document.createElement(tag)
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useKeyPress — filter shapes', () => {
  it('fires for a single alias filter only when the keyCode matches', async () => {
    const handler = vi.fn()
    const { result } = await renderHook(() => useKeyPress('c', handler))

    // a brand-new hook returns nothing (upstream returns `void`)
    expect(result.current).toBeUndefined()

    press({ key: 'c', keyCode: 67 })
    expect(handler).toHaveBeenCalledTimes(1)

    press({ key: 'd', keyCode: 68 })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('requires every segment of a compound filter to match', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('shift.c', handler))

    press({ key: 'c', keyCode: 67 })
    expect(handler).toHaveBeenCalledTimes(0)

    press({ key: 'c', keyCode: 67, shiftKey: true })
    expect(handler).toHaveBeenCalledTimes(1)

    press({ key: 'd', keyCode: 68, shiftKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('reports the matched filter as `key`, resolving the array entry with exactMatch', async () => {
    // upstream's `test key in eventHandler parameter`: an array hands out the
    // *filter* that matched — `Array.prototype.find`, so without `exactMatch`
    // the first entry that matches at all wins (`c` for every `c` press).
    const KEYS: KeyPressFilter = ['c', 'shift.c', 'shift.ctrl.c']
    const exactKeys: KeyType[] = []
    const looseKeys: KeyType[] = []
    const exact = vi.fn((_event: KeyboardEvent, key: KeyType) => exactKeys.push(key))
    const loose = vi.fn((_event: KeyboardEvent, key: KeyType) => looseKeys.push(key))
    await renderHook(() => useKeyPress(KEYS, exact, { exactMatch: true }))
    await renderHook(() => useKeyPress(KEYS, loose))

    press({ key: 'c', keyCode: 67 })
    expect(exactKeys.at(-1)).toBe('c')
    expect(looseKeys.at(-1)).toBe('c')

    press({ key: 'c', keyCode: 67, shiftKey: true })
    expect(exactKeys.at(-1)).toBe('shift.c')
    expect(looseKeys.at(-1)).toBe('c')

    press({ key: 'c', keyCode: 67, shiftKey: true, ctrlKey: true })
    expect(exactKeys.at(-1)).toBe('shift.ctrl.c')
    expect(looseKeys.at(-1)).toBe('c')

    expect(exact).toHaveBeenCalledTimes(3)
    expect(loose).toHaveBeenCalledTimes(3)
  })

  it('supports a custom predicate as the filter', async () => {
    const everyKey = vi.fn()
    const someKeys = vi.fn()
    await renderHook(() => useKeyPress(() => true, everyKey))
    await renderHook(() => useKeyPress(event => ['0', 'meta'].includes(event.key), someKeys))

    press({ key: '0', keyCode: 48 })
    press({ key: 'a', keyCode: 65 })
    press({ key: 'meta', keyCode: 91, metaKey: true })

    expect(everyKey).toHaveBeenCalledTimes(3)
    expect(someKeys).toHaveBeenCalledTimes(2)
  })

  it('matches numbers as raw keyCodes, mixed with string aliases', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress(['0', 65], handler))

    press({ key: '0', keyCode: 48 })
    press({ key: 'a', keyCode: 65 })
    press({ key: 'b', keyCode: 66 })

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('ignores events without a `key` (autofill fires them)', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('a', handler))

    press({ key: '', keyCode: 65 })

    expect(handler).toHaveBeenCalledTimes(0)
  })

  it('does not read modifier names off `Object.prototype` (divergence from the pin)', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress(['constructor', 'toString', '__proto__'], handler))

    press({ key: 'a', keyCode: 65 })

    // Upstream indexes `modifierKey` through `as any`, so `constructor` and
    // `toString` matched by accident (and `__proto__` threw); own-property
    // lookup makes a pathological segment inert.
    expect(handler).toHaveBeenCalledTimes(0)
  })
})

describe('useKeyPress — aliases', () => {
  it('matches the alias table case-insensitively', async () => {
    const camel = vi.fn()
    const lower = vi.fn()
    const upper = vi.fn()
    await renderHook(() => useKeyPress('CapsLock', camel))
    await renderHook(() => useKeyPress('capslock', lower))
    await renderHook(() => useKeyPress('CAPSLOCK', upper))

    press({ key: 'CapsLock', keyCode: 20 })

    expect(camel).toHaveBeenCalledTimes(1)
    expect(lower).toHaveBeenCalledTimes(1)
    expect(upper).toHaveBeenCalledTimes(1)
  })

  it('matches `numpad*`, `arrow*` and legacy aliases', async () => {
    const keys: KeyType[] = []
    const handler = vi.fn((_event: KeyboardEvent, key: KeyType) => keys.push(key))
    await renderHook(() => useKeyPress(['numpad0', 'numpad9', 'arrowleft', 'leftarrow', 'graveaccent'], handler))

    press({ key: '0', keyCode: 96 })
    press({ key: '9', keyCode: 105 })
    press({ key: 'ArrowLeft', keyCode: 37 })
    press({ key: '`', keyCode: 192 })

    // `arrowleft` and `leftarrow` are the same keyCode, so only the first entry matches
    expect(keys).toEqual(['numpad0', 'numpad9', 'arrowleft', 'graveaccent'])
  })

  it('matches standard and legacy spellings of the same keyCode', async () => {
    const handler = vi.fn()
    await renderHook(() =>
      useKeyPress(
        ['control', 'ctrl', 'escape', 'esc', 'arrowleft', 'leftarrow', 'spacebar', 'space', 'contextmenu', 'selectkey', 'pause', 'pausebreak'],
        handler,
      ),
    )

    press({ key: 'Control', keyCode: 17, ctrlKey: true })
    press({ key: 'Escape', keyCode: 27 })
    press({ key: 'ArrowLeft', keyCode: 37 })
    press({ key: ' ', keyCode: 32 })
    press({ key: 'ContextMenu', keyCode: 93 })
    press({ key: 'Pause', keyCode: 19 })

    expect(handler).toHaveBeenCalledTimes(6)
  })

  it('lower-cases alias segments but reads modifier segments verbatim (upstream parity)', async () => {
    const aliasCase = vi.fn()
    const modifierCase = vi.fn()
    await renderHook(() => useKeyPress('shift.CapsLock', aliasCase))
    await renderHook(() => useKeyPress('Shift.capslock', modifierCase))

    press({ key: 'CapsLock', keyCode: 20, shiftKey: true })

    // the alias segment goes through `key.toLowerCase()`, so `CapsLock` matches...
    expect(aliasCase).toHaveBeenCalledTimes(1)
    // ...while the modifier segment is indexed verbatim, so `Shift` is not one
    // of the four modifier names (upstream indexes `modifierKey` with `key`)
    expect(modifierCase).toHaveBeenCalledTimes(0)
  })

  it('matches by `keyCode`, not by `event.key`', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('a', handler))

    // a real browser reports `A` for shift+a, but the deprecated keyCode is unchanged
    press({ key: 'A', keyCode: 65, shiftKey: true })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('matches real browser key events (Chromium populates the deprecated keyCode)', async () => {
    const single = vi.fn()
    const combo = vi.fn()
    await renderHook(() => useKeyPress('a', single))
    await renderHook(() => useKeyPress('ctrl.a', combo))

    await userEvent.keyboard('a')
    expect(single).toHaveBeenCalledTimes(1)
    expect(combo).toHaveBeenCalledTimes(0)

    await userEvent.keyboard('{Control>}a{/Control}')
    expect(single).toHaveBeenCalledTimes(2)
    expect(combo).toHaveBeenCalledTimes(1)
  })
})

describe('useKeyPress — modifiers and exactMatch', () => {
  it.each([
    ['ctrl', { ctrlKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['meta', { metaKey: true }],
  ] as const)('matches a %s modifier combination', async (modifier, flags) => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress(`${modifier}.c`, handler))

    press({ key: 'c', keyCode: 67, ...flags })
    expect(handler).toHaveBeenCalledTimes(1)

    press({ key: 'd', keyCode: 68, ...flags })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('fires a plain modifier filter for a superset of modifiers by default', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('ctrl', handler))

    press({ key: 'Control', keyCode: 17, ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(1)

    // default (exactMatch: false) — `ctrl+a` still fires the `ctrl` listener
    press({ key: 'a', keyCode: 65, ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('blocks a superset of modifiers with exactMatch: true', async () => {
    const ctrl = vi.fn()
    const c = vi.fn()
    await renderHook(() => useKeyPress('ctrl', ctrl, { exactMatch: true }))
    await renderHook(() => useKeyPress('c', c, { exactMatch: true }))

    // upstream's `test combination keys by exact match`: while `ctrl` is held,
    // neither `ctrl` alone (an extra key is down: `c`) nor `c` (an extra
    // modifier is down: `ctrl`) may fire.
    press({ key: 'c', keyCode: 67, ctrlKey: true })
    expect(ctrl).toHaveBeenCalledTimes(0)
    expect(c).toHaveBeenCalledTimes(0)

    press({ key: 'Control', keyCode: 17, ctrlKey: true })
    expect(ctrl).toHaveBeenCalledTimes(1)

    press({ key: 'c', keyCode: 67 })
    expect(c).toHaveBeenCalledTimes(1)
  })

  it('requires the full modifier set with exactMatch: true', async () => {
    const one = vi.fn()
    const two = vi.fn()
    const three = vi.fn()
    await renderHook(() => useKeyPress(['shift.c'], one, { exactMatch: true }))
    await renderHook(() => useKeyPress(['ctrl.shift.c'], two, { exactMatch: true }))
    await renderHook(() => useKeyPress(['ctrl.shift.c'], three))

    press({ key: 'c', keyCode: 67, shiftKey: true })
    expect(one).toHaveBeenCalledTimes(1)
    expect(two).toHaveBeenCalledTimes(0)

    press({ key: 'c', keyCode: 67, shiftKey: true, ctrlKey: true })
    expect(one).toHaveBeenCalledTimes(1)
    expect(two).toHaveBeenCalledTimes(1)
    expect(three).toHaveBeenCalledTimes(1)
  })
})

describe('useKeyPress — events', () => {
  it('listens to keydown by default, not keyup', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('a', handler))

    release({ key: 'a', keyCode: 65 })
    expect(handler).toHaveBeenCalledTimes(0)

    press({ key: 'a', keyCode: 65 })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('listens to every configured event', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('a', handler, { events: ['keydown', 'keyup'] }))

    press({ key: 'a', keyCode: 65 })
    release({ key: 'a', keyCode: 65 })

    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('falls back to the keyCode for a modifier keyup', async () => {
    const meta = vi.fn()
    await renderHook(() => useKeyPress('meta', meta, { events: ['keyup'] }))

    release({ key: 'meta', keyCode: 91, metaKey: false })
    expect(meta).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['shift', { key: 'Shift', keyCode: 16, shiftKey: false }],
    ['ctrl', { key: 'Control', keyCode: 17, ctrlKey: false }],
    ['alt', { key: 'Alt', keyCode: 18, altKey: false }],
  ] as const)('handles a %s keyup with exactMatch', async (modifier, init) => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress(modifier, handler, { events: ['keyup'], exactMatch: true }))

    release(init)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('respects other held modifiers on a keyup with exactMatch', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('shift', handler, { events: ['keyup'], exactMatch: true }))

    release({ key: 'Shift', keyCode: 16, shiftKey: false, ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(0)
  })

  it('deep-compares the events array and re-binds only when it changes', async () => {
    const el = createTarget()
    const add = vi.spyOn(el, 'addEventListener')
    const remove = vi.spyOn(el, 'removeEventListener')
    const handler = vi.fn()

    const { rerender } = await renderHook(
      (props?: { events: KeyPressEvent[] }) => useKeyPress('a', handler, { target: el, events: props!.events }),
      { initialProps: { events: ['keydown'] as KeyPressEvent[] } },
    )

    expect(add).toHaveBeenCalledTimes(1)

    // an inline array rebuilt with equal contents must not churn the listener
    await rerender({ events: ['keydown'] })
    expect(add).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledTimes(0)

    // a genuinely different event set must re-bind, symmetrically
    await rerender({ events: ['keyup'] })
    expect(add).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledTimes(1)

    press({ key: 'a', keyCode: 65 }, el)
    expect(handler).toHaveBeenCalledTimes(0)
    release({ key: 'a', keyCode: 65 }, el)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('binds in the capture phase when useCapture is set', async () => {
    const parent = createTarget()
    const child = document.createElement('span')
    parent.appendChild(child)

    const capture = vi.fn()
    const bubble = vi.fn()
    await renderHook(() => useKeyPress('a', capture, { target: parent, useCapture: true }))
    await renderHook(() => useKeyPress('a', bubble, { target: parent }))

    // a non-bubbling event dispatched on the child never reaches a bubble-phase
    // ancestor listener, but the capture phase walks down to it
    child.dispatchEvent(keyEvent('keydown', { key: 'a', keyCode: 65, bubbles: false }))

    expect(capture).toHaveBeenCalledTimes(1)
    expect(bubble).toHaveBeenCalledTimes(0)
  })
})

describe('useKeyPress — target', () => {
  it('defaults to window', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('a', handler, { target: undefined }))

    press({ key: 'a', keyCode: 65 })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('binds to a plain element and not to window', async () => {
    const el = createTarget()
    const sibling = createTarget('span')
    const handler = vi.fn()
    await renderHook(() => useKeyPress('a', handler, { target: el }))

    press({ key: 'a', keyCode: 65 }, sibling)
    expect(handler).toHaveBeenCalledTimes(0)

    press({ key: 'a', keyCode: 65 }, el)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('binds to a ref that is attached during the same commit', async () => {
    const handler = vi.fn()
    function Host() {
      const ref = useRef<HTMLDivElement>(null)
      useKeyPress('escape', handler, { target: ref })
      return <div data-testid="kp-ref-target" ref={ref} />
    }

    await render(<Host />)
    const el = document.querySelector('[data-testid="kp-ref-target"]')!

    // the ref is resolved when the effect runs, i.e. after this commit attached it
    press({ key: 'Escape', keyCode: 27 }, el)
    expect(handler).toHaveBeenCalledTimes(1)

    press({ key: 'Escape', keyCode: 27 })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('re-binds when the ref points at another element', async () => {
    const first = createTarget()
    const second = createTarget()
    const handler = vi.fn()
    const ref: { current: HTMLElement | null } = { current: first }

    const { rerender } = await renderHook(() => useKeyPress('a', handler, { target: ref }))

    press({ key: 'a', keyCode: 65 }, first)
    expect(handler).toHaveBeenCalledTimes(1)

    ref.current = second
    await rerender()

    press({ key: 'a', keyCode: 65 }, first)
    expect(handler).toHaveBeenCalledTimes(1)

    press({ key: 'a', keyCode: 65 }, second)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('accepts a resolver function', async () => {
    const el = createTarget()
    const sibling = createTarget('span')
    const handler = vi.fn()
    await renderHook(() => useKeyPress('a', handler, { target: () => el }))

    press({ key: 'a', keyCode: 65 }, sibling)
    expect(handler).toHaveBeenCalledTimes(0)

    press({ key: 'a', keyCode: 65 }, el)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fall back to window when a resolver resolves to null', async () => {
    const handler = vi.fn()
    await renderHook(() => useKeyPress('a', handler, { target: () => null }))

    press({ key: 'a', keyCode: 65 })

    expect(handler).toHaveBeenCalledTimes(0)
  })
})

describe('useKeyPress — lifecycle', () => {
  it('removes the listener on unmount', async () => {
    const el = createTarget()
    const remove = vi.spyOn(el, 'removeEventListener')
    const handler = vi.fn()
    const { unmount } = await renderHook(() => useKeyPress('a', handler, { target: el }))

    press({ key: 'a', keyCode: 65 }, el)
    expect(handler).toHaveBeenCalledTimes(1)

    unmount()
    expect(remove).toHaveBeenCalledTimes(1)

    press({ key: 'a', keyCode: 65 }, el)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('reads the latest handler without re-binding', async () => {
    const el = createTarget()
    const add = vi.spyOn(el, 'addEventListener')
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = await renderHook(
      (props?: { handler: (event: KeyboardEvent, key: KeyType) => void }) => useKeyPress('a', props!.handler, { target: el }),
      { initialProps: { handler: first } },
    )

    press({ key: 'a', keyCode: 65 }, el)
    expect(first).toHaveBeenCalledTimes(1)

    await rerender({ handler: second })
    press({ key: 'a', keyCode: 65 }, el)

    expect(second).toHaveBeenCalledTimes(1)
    expect(first).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('reads the latest filter without re-binding', async () => {
    const el = createTarget()
    const add = vi.spyOn(el, 'addEventListener')
    const handler = vi.fn()

    const { rerender } = await renderHook(
      (props?: { filter: KeyPressFilter }) => useKeyPress(props!.filter, handler, { target: el }),
      { initialProps: { filter: 'a' as KeyPressFilter } },
    )

    press({ key: 'b', keyCode: 66 }, el)
    expect(handler).toHaveBeenCalledTimes(0)

    await rerender({ filter: 'b' })
    press({ key: 'b', keyCode: 66 }, el)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledTimes(1)
  })
})

describe('useKeyPress — signature', () => {
  it('keeps upstream\'s types, with hook-scoped names and named exports', () => {
    expect(useKeyPress).toBeTypeOf('function')
    expectTypeOf(useKeyPress).returns.toBeVoid()
    expectTypeOf(useKeyPress).parameter(0).toEqualTypeOf<KeyPressFilter>()
    expectTypeOf(useKeyPress).parameter(1).toEqualTypeOf<(event: KeyboardEvent, key: KeyType) => void>()

    // upstream `KeyType` is `number | string`, so raw keyCodes are part of the filter...
    expectTypeOf<number>().toExtend<KeyType>()
    expectTypeOf<string>().toExtend<KeyType>()
    // ...which is exactly what `useKeyStroke`'s filter does *not* accept, and the
    // reason this port documents the widening instead of touching that hook.
    expectTypeOf<number>().not.toExtend<KeyStrokeFilter>()
  })
})
