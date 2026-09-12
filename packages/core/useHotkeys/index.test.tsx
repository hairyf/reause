import type { HotkeyItem } from '../useHotkeys'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { getHotkeyHandler, getHotkeyMatcher, parseHotkey, useHotkeys } from '../useHotkeys'

/** The platform the test browser actually reports, for the `mod` probe below. */
const PLATFORM = navigator.platform

/**
 * Dispatch a real `keydown` on `document.documentElement` — the node the hook
 * listens on — or on another target that bubbles up to it (an input, so the
 * `tagsToIgnore` guard sees a real `event.target`). `cancelable` is required for
 * the `preventDefault` assertions to be observable.
 */
function press(
  init: KeyboardEventInit,
  target: EventTarget = document.documentElement,
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

/**
 * Spoof the reported platform. Returns the restore function, or `undefined`
 * when the browser makes `navigator.platform` non-configurable — the test
 * records which of the two happened instead of assuming.
 */
function stubPlatform(value: string): (() => void) | undefined {
  const own = Object.getOwnPropertyDescriptor(navigator, 'platform')
  if (own && !own.configurable) {
    return undefined
  }
  Object.defineProperty(navigator, 'platform', { configurable: true, get: () => value })
  return () => {
    if (own) {
      Object.defineProperty(navigator, 'platform', own)
    }
    else {
      delete (navigator as { platform?: string }).platform
    }
  }
}

describe('useHotkeys module surface', () => {
  it('exports the hook, the element variant and the parser helpers', () => {
    expect(useHotkeys).toBeTypeOf('function')
    expect(getHotkeyHandler).toBeTypeOf('function')
    expect(getHotkeyMatcher).toBeTypeOf('function')
    expect(parseHotkey).toBeTypeOf('function')
  })

  it('re-exports the hook and getHotkeyHandler from the @reause/core barrel', async () => {
    const core = await import('@reause/core')
    expect(core.useHotkeys).toBe(useHotkeys)
    expect(core.getHotkeyHandler).toBe(getHotkeyHandler)
    expect(core.getHotkeyMatcher).toBe(getHotkeyMatcher)
    expect(core.parseHotkey).toBe(parseHotkey)
  })

  it('types: void return, hotkey list, optional guards and per-item options', () => {
    expectTypeOf(useHotkeys).returns.toEqualTypeOf<void>()
    expectTypeOf(useHotkeys).parameter(0).toEqualTypeOf<HotkeyItem[]>()
    expectTypeOf(useHotkeys).parameter(1).toEqualTypeOf<string[] | undefined>()
    expectTypeOf(useHotkeys).parameter(2).toEqualTypeOf<boolean | undefined>()
    expectTypeOf(getHotkeyHandler).parameter(0).toEqualTypeOf<HotkeyItem[]>()
    expectTypeOf(getHotkeyMatcher).parameter(0).toEqualTypeOf<string>()
    expectTypeOf(getHotkeyMatcher).parameter(1).toEqualTypeOf<boolean | undefined>()
  })
})

// Mirrors upstream `parse-hotkey.test.ts`.
describe('parseHotkey', () => {
  it('parses a hotkey string into modifier flags plus one free key', () => {
    expect(parseHotkey('meta+S')).toEqual({
      alt: false,
      ctrl: false,
      meta: true,
      mod: false,
      shift: false,
      key: 's',
    })

    expect(parseHotkey('alt+shift+L')).toEqual({
      alt: true,
      ctrl: false,
      meta: false,
      mod: false,
      shift: true,
      key: 'l',
    })

    expect(parseHotkey('mod+K')).toEqual({
      alt: false,
      ctrl: false,
      meta: false,
      mod: true,
      shift: false,
      key: 'k',
    })

    expect(parseHotkey('ctrl+shift+alt+K')).toEqual({
      alt: true,
      ctrl: true,
      meta: false,
      mod: false,
      shift: true,
      key: 'k',
    })
  })

  it('keeps only the first free key (upstream behaviour)', () => {
    expect(parseHotkey('mod+S+A')).toEqual({
      alt: false,
      ctrl: false,
      meta: false,
      mod: true,
      shift: false,
      key: 's',
    })
  })

  it('maps the [plus] spelling to the + key', () => {
    expect(parseHotkey('ctrl+[plus]')).toMatchObject({ ctrl: true, key: '+' })
    expect(parseHotkey('ctrl+[plus]+shift+alt+[plus]')).toMatchObject({
      alt: true,
      ctrl: true,
      shift: true,
      key: '+',
    })
  })

  it('keeps Escape / Esc / esc as written — normalisation happens at match time', () => {
    expect(parseHotkey('Escape').key).toBe('escape')
    expect(parseHotkey('Esc').key).toBe('esc')
    expect(parseHotkey('ESC').key).toBe('esc')
  })
})

// Mirrors upstream `parse-hotkey.test.ts` (the matcher half).
describe('getHotkeyMatcher', () => {
  it('requires every modifier to match exactly', () => {
    expect(getHotkeyMatcher('ctrl+alt+I')(
      new KeyboardEvent('keydown', { ctrlKey: true, altKey: true, key: 'I' }),
    )).toBe(true)

    // an extra ctrl the hotkey does not name is a mismatch, not a superset match
    expect(getHotkeyMatcher('shift+alt+O')(
      new KeyboardEvent('keydown', { ctrlKey: true, altKey: true, shiftKey: true, key: 'O' }),
    )).toBe(false)

    expect(getHotkeyMatcher('alt+L')(
      new KeyboardEvent('keydown', { metaKey: true, key: 'L' }),
    )).toBe(false)
  })

  it('matches mod through ctrl (non-Apple) and meta (Apple) with no platform probe', () => {
    expect(getHotkeyMatcher('mod+E')(
      new KeyboardEvent('keydown', { ctrlKey: true, key: 'E' }),
    )).toBe(true)

    expect(getHotkeyMatcher('mod+E')(
      new KeyboardEvent('keydown', { metaKey: true, key: 'E' }),
    )).toBe(true)

    // ...and a bare ctrl/meta hotkey does not become mod-like
    expect(getHotkeyMatcher('ctrl+E')(
      new KeyboardEvent('keydown', { metaKey: true, key: 'E' }),
    )).toBe(false)
  })

  it('reads event.code when usePhysicalKeys is set and event.key otherwise', () => {
    const physical = () => new KeyboardEvent('keydown', { ctrlKey: true, code: 'KeyK', key: 'n' })
    expect(getHotkeyMatcher('mod+k', true)(physical())).toBe(true)
    expect(getHotkeyMatcher('mod+k', false)(physical())).toBe(false)
    expect(getHotkeyMatcher('mod+k')(physical())).toBe(false)

    // a physical key remains recognisable through either spelling
    expect(getHotkeyMatcher('A', true)(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
    // `Numpad1` is not `Digit1`: the code decides, not the printed digit
    expect(getHotkeyMatcher('1', true)(new KeyboardEvent('keydown', { code: 'Numpad1' }))).toBe(false)
    expect(getHotkeyMatcher('Digit1', true)(new KeyboardEvent('keydown', { code: 'Digit1' }))).toBe(true)
    // pinned upstream gotcha: the `Key` prefix bridge does not extend to `Digit`,
    // so a physical hotkey must be written the way the code reads
    expect(getHotkeyMatcher('1', true)(new KeyboardEvent('keydown', { code: 'Digit1' }))).toBe(false)
  })

  it('normalises the space key, the plus key and the Escape spellings', () => {
    expect(getHotkeyMatcher('shift+space')(
      new KeyboardEvent('keydown', { shiftKey: true, key: ' ' }),
    )).toBe(true)

    expect(getHotkeyMatcher('shift+[plus]')(
      new KeyboardEvent('keydown', { shiftKey: true, key: '+' }),
    )).toBe(true)

    for (const spelling of ['Escape', 'escape', 'esc', 'ESC']) {
      expect(
        getHotkeyMatcher(spelling)(new KeyboardEvent('keydown', { key: 'Escape' })),
        spelling,
      ).toBe(true)
    }

    expect(getHotkeyMatcher('mod+esc')(
      new KeyboardEvent('keydown', { ctrlKey: true, key: 'Escape' }),
    )).toBe(true)
  })
})

// Mirrors upstream `use-hotkeys.test.tsx`.
describe('useHotkeys', () => {
  it('fires the handler of a matching hotkey and not of a mismatching one', async () => {
    const matched = vi.fn()
    const other = vi.fn()

    await renderHook(() => useHotkeys([['shift+ctrl+S', matched], ['alt+L', other]]))

    press({ shiftKey: true, ctrlKey: true, key: 'S' })

    expect(matched).toHaveBeenCalledTimes(1)
    expect(other).not.toHaveBeenCalled()
  })

  it('does not fire when the modifiers or the key mismatch', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['mod+P', handler]]))

    press({ metaKey: true, altKey: true, key: 'P' })
    press({ key: 'P' })
    press({ metaKey: true, key: 'Q' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('passes the native KeyboardEvent to the handler', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['ctrl+S', handler]]))

    press({ ctrlKey: true, key: 'S' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toBeInstanceOf(KeyboardEvent)
  })

  it('fires every matching entry, in list order', async () => {
    const calls: string[] = []

    await renderHook(() => useHotkeys([
      ['mod+k', () => calls.push('first')],
      ['mod+k', () => calls.push('second')],
    ]))

    press({ ctrlKey: true, key: 'k' })

    expect(calls).toEqual(['first', 'second'])
  })

  it('matches the space key and the [plus] spelling', async () => {
    const space = vi.fn()
    const plus = vi.fn()

    await renderHook(() => useHotkeys([['shift+space', space], ['shift+[plus]', plus]]))

    press({ shiftKey: true, key: ' ', code: 'Space' })
    expect(space).toHaveBeenCalledTimes(1)
    expect(plus).not.toHaveBeenCalled()

    press({ shiftKey: true, key: '+', code: 'Equal' })
    expect(plus).toHaveBeenCalledTimes(1)
  })

  it('matches Escape through every documented spelling', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['Esc', handler]]))

    press({ key: 'Escape' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('skips keydown from tagsToIgnore targets — the input-focus guard', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['mod+k', handler]]))

    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT'] as const) {
      const element = document.createElement(tag)
      document.body.appendChild(element)
      press({ ctrlKey: true, key: 'k' }, element)
      element.remove()
      expect(handler, `${tag} must be ignored`).not.toHaveBeenCalled()
    }

    // ...while the same key outside those tags still fires
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    press({ ctrlKey: true, key: 'k' }, outside)
    outside.remove()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fire while a real input is focused, and does again once it blurs', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['k', handler]]))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    expect(document.activeElement).toBe(input)

    press({ key: 'k' }, input)
    expect(handler).not.toHaveBeenCalled()

    input.blur()
    press({ key: 'k' })
    expect(handler).toHaveBeenCalledTimes(1)
    input.remove()
  })

  it('honours a custom tagsToIgnore list, including an empty one', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['k', handler]], []))

    const input = document.createElement('input')
    document.body.appendChild(input)
    press({ key: 'k' }, input)
    input.remove()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('skips contentEditable targets unless triggerOnContentEditable is true', async () => {
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    document.body.appendChild(editable)

    const off = vi.fn()
    const { unmount } = await renderHook(() => useHotkeys([['k', off]]))
    press({ key: 'k' }, editable)
    expect(off).not.toHaveBeenCalled()
    await unmount()

    const on = vi.fn()
    await renderHook(() => useHotkeys([['k', on]], undefined, true))
    press({ key: 'k' }, editable)
    expect(on).toHaveBeenCalledTimes(1)

    editable.remove()
  })

  it('still applies tagsToIgnore when triggerOnContentEditable is true', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['k', handler]], ['INPUT'], true))

    const input = document.createElement('input')
    document.body.appendChild(input)
    press({ key: 'k' }, input)
    input.remove()

    // upstream drops only the contentEditable check, never the tag list
    expect(handler).not.toHaveBeenCalled()
  })

  it('prevents the default by default and leaves the event alone when disabled', async () => {
    const prevented = vi.fn()
    const untouched = vi.fn()

    await renderHook(() => useHotkeys([
      ['ctrl+S', prevented],
      ['ctrl+D', untouched, { preventDefault: false }],
    ]))

    expect(press({ ctrlKey: true, key: 'S' }).defaultPrevented).toBe(true)
    expect(press({ ctrlKey: true, key: 'D' }).defaultPrevented).toBe(false)

    expect(prevented).toHaveBeenCalledTimes(1)
    expect(untouched).toHaveBeenCalledTimes(1)
  })

  it('matches event.code when usePhysicalKeys is true, ignoring event.key', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['mod+k', handler, { usePhysicalKeys: true }]]))

    // same physical key, different logical key (AZERTY / Dvorak): still matches
    press({ ctrlKey: true, code: 'KeyK', key: 'n' })
    expect(handler).toHaveBeenCalledTimes(1)

    // inverse: the logical key alone must not satisfy a physical matcher
    press({ ctrlKey: true, code: 'KeyN', key: 'k' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('matches event.key when usePhysicalKeys is off — the default', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['mod+k', handler]]))

    press({ ctrlKey: true, code: 'KeyK', key: 'n' })
    expect(handler).not.toHaveBeenCalled()

    press({ ctrlKey: true, code: 'KeyN', key: 'k' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('treats Digit1 as an unclear numerical assignment for Numpad1', async () => {
    const handler = vi.fn()

    // upstream's own spelling: the physical name, not the printed digit — `'1'`
    // would normalise to `'1'` and never equal `'digit1'`
    await renderHook(() => useHotkeys([['Digit1', handler, { usePhysicalKeys: true }]]))

    press({ code: 'Numpad1' })
    expect(handler).not.toHaveBeenCalled()

    press({ code: 'Digit1' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('resolves mod through ctrl and meta without reading the platform', async () => {
    const handler = vi.fn()

    await renderHook(() => useHotkeys([['mod+k', handler]]))

    // non-Apple activation path: Ctrl+K
    press({ ctrlKey: true, key: 'k' })
    expect(handler).toHaveBeenCalledTimes(1)

    // Apple activation path: Cmd+K — same branch, no detection needed
    press({ metaKey: true, key: 'k' })
    expect(handler).toHaveBeenCalledTimes(2)

    // Spoofing an Apple platform must change nothing: the matcher is a pure
    // function of the hotkey and the event, so no `navigator` read exists to
    // consult (and none at module scope for SSR to trip over).
    const restore = stubPlatform('MacIntel')
    expect(restore, 'navigator.platform must be stubbable in this browser').toBeDefined()
    expect(navigator.platform).toBe('MacIntel')
    try {
      press({ metaKey: true, key: 'k' })
      expect(handler).toHaveBeenCalledTimes(3)
      press({ ctrlKey: true, key: 'k' })
      expect(handler).toHaveBeenCalledTimes(4)
    }
    finally {
      restore?.()
    }

    expect(navigator.platform).toBe(PLATFORM)
  })

  it('calls the latest handler after a rerender (no stale closure)', async () => {
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = await renderHook(
      (props?: { handler: (event: KeyboardEvent) => void }) =>
        useHotkeys([['ctrl+S', props?.handler ?? first]]),
      { initialProps: { handler: first } },
    )

    await rerender({ handler: second })

    press({ ctrlKey: true, key: 'S' })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('reads the latest guards after a rerender too', async () => {
    const handler = vi.fn()

    const { rerender } = await renderHook(
      (props?: { tags: string[] }) => useHotkeys([['k', handler]], props?.tags),
      { initialProps: { tags: ['INPUT'] } },
    )

    const input = document.createElement('input')
    document.body.appendChild(input)

    press({ key: 'k' }, input)
    expect(handler).not.toHaveBeenCalled()

    // dropping INPUT from the guard list must take effect without re-subscribing
    await rerender({ tags: [] })
    press({ key: 'k' }, input)
    expect(handler).toHaveBeenCalledTimes(1)

    input.remove()
  })

  it('registers the listener once and survives re-renders with inline arrays', async () => {
    const add = vi.spyOn(document.documentElement, 'addEventListener')
    const remove = vi.spyOn(document.documentElement, 'removeEventListener')
    const handler = vi.fn()

    const { rerender } = await renderHook(
      (props?: { tick: number }) => {
        useHotkeys([['ctrl+S', handler]])
        return props?.tick ?? 0
      },
      { initialProps: { tick: 0 } },
    )

    const keydownCalls = (spy: typeof add) =>
      spy.mock.calls.filter(([type]) => type === 'keydown').length

    const adds = keydownCalls(add)
    const removes = keydownCalls(remove)

    await rerender({ tick: 1 })
    await rerender({ tick: 2 })

    expect(keydownCalls(add)).toBe(adds)
    expect(keydownCalls(remove)).toBe(removes)

    add.mockRestore()
    remove.mockRestore()
  })

  it('removes the listener on unmount — no stray handler fires afterwards', async () => {
    const handler = vi.fn()

    const { unmount } = await renderHook(() => useHotkeys([['ctrl+S', handler]]))

    press({ ctrlKey: true, key: 'S' })
    expect(handler).toHaveBeenCalledTimes(1)

    await unmount()

    press({ ctrlKey: true, key: 'S' })
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('getHotkeyHandler', () => {
  it('fires only for the element it is bound to', async () => {
    const handler = vi.fn()

    const screen = await render(
      <div>
        <input data-testid="bound" onKeyDown={getHotkeyHandler([['mod+Enter', handler]])} />
        <input data-testid="other" />
      </div>,
    )

    const [bound, other] = screen.container.querySelectorAll('input')

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: 'Enter',
    })
    bound.dispatchEvent(event)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toBeInstanceOf(KeyboardEvent)
    // the element variant calls preventDefault by default
    expect(event.defaultPrevented).toBe(true)

    // the sibling element has no handler — and a document-level press is out of
    // scope for an element-bound handler
    other.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key: 'Enter' }))
    press({ ctrlKey: true, key: 'Enter' })
    expect(handler).toHaveBeenCalledTimes(1)

    await screen.unmount()
  })

  it('accepts a native event and honours per-item preventDefault', () => {
    const prevented = vi.fn()
    const untouched = vi.fn()

    const onKeyDown = getHotkeyHandler([
      ['mod+Enter', prevented],
      ['shift+Escape', untouched, { preventDefault: false }],
    ])

    const first = new KeyboardEvent('keydown', { ctrlKey: true, key: 'Enter', cancelable: true })
    onKeyDown(first)
    expect(prevented).toHaveBeenCalledTimes(1)
    expect(first.defaultPrevented).toBe(true)

    const second = new KeyboardEvent('keydown', { shiftKey: true, key: 'Escape', cancelable: true })
    onKeyDown(second)
    expect(untouched).toHaveBeenCalledTimes(1)
    expect(second.defaultPrevented).toBe(false)
  })

  it('does not apply the useHotkeys input guard', () => {
    const handler = vi.fn()

    const onKeyDown = getHotkeyHandler([['mod+k', handler]])

    const input = document.createElement('input')
    document.body.appendChild(input)
    // the element it is bound to is the scope, so an input target fires
    onKeyDown(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }))
    input.remove()

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
