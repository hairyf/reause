import type { RefObject } from 'react'
import { useDeepCompareEffect, useLatest, useUnmount } from '@reause/shared'
import { useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/** A keyboard event identifier: either a `keyCode` (number) or a key filter (string). */
export type KeyType = number | string
/** Custom filter: return the matched key to fire with it, or a falsy value to skip the event. */
export type KeyPressPredicate = (event: KeyboardEvent) => KeyType | boolean | undefined
/** A single key, an array of keys, or a custom predicate. */
export type KeyPressFilter = KeyType | KeyType[] | KeyPressPredicate
export type KeyPressEvent = 'keydown' | 'keyup'

/**
 * Event target: a React ref object (`RefObject`) holding the event target (AGENTS.md §2).
 */
export type KeyPressTarget = RefObject<EventTarget | null | undefined>

export interface UseKeyPressOptions {
  /**
   * Events to listen to. Every name is registered and removed symmetrically.
   *
   * @default ['keydown']
   */
  events?: KeyPressEvent[]
  /**
   * Element to bind the listeners to. Accepts a React ref object (`RefObject`) holding the element,
   * and falls back to `window`.
   *
   * @default window
   */
  target?: KeyPressTarget
  /**
   * Require the event to carry **exactly** the filtered modifiers, so listening for `ctrl` no
   * longer fires while `ctrl+a` is pressed.
   *
   * @default false
   */
  exactMatch?: boolean
  /**
   * Register the listeners in the capture phase.
   *
   * @default false
   */
  useCapture?: boolean
}

/**
 * `navigator.platform` reports a macOS-ish device. Mirrors ahooks' `utils/isAppleDevice.ts`
 * (`source/ahooks/packages/hooks/src/utils/isAppleDevice.ts`) — deliberately **not**
 * `@reause/shared`'s `isIOS`, which detects iPhone/iPad only (by `userAgent`, plus the
 * iPad-Pro-as-Macintosh case) while upstream also matches macOS by `platform`. The alias table's
 * `meta` entry depends on it.
 */
// the top-level alternation needs no group: lint requires neither a capturing
// group (unused) nor a non-capturing one (redundant at this position)
const isAppleDevice = /mac|iphone|ipod|ipad/i.test(
  typeof navigator === 'undefined' ? '' : navigator.platform,
)

/** `meta` (Command on macOS, the Windows key elsewhere) — the one alias holding several key codes. */
const metaKeyCodes: number[] = isAppleDevice ? [91, 93] : [91, 92]

/**
 * Keyboard `keyCode` aliases, mirrored entry for entry from upstream's `aliasKeyCodeMap`. Lookups
 * are lower-cased, which is what makes the documented `CapsLock` spelling work; annotated as a
 * string record so a filter segment can index it without the `as any` upstream needs.
 */
const aliasKeyCodeMap: Record<string, number | number[]> = {
  0: 48,
  1: 49,
  2: 50,
  3: 51,
  4: 52,
  5: 53,
  6: 54,
  7: 55,
  8: 56,
  9: 57,
  backspace: 8,
  tab: 9,
  enter: 13,
  shift: 16,
  // Legacy alias kept for compatibility; standard name is "control".
  ctrl: 17,
  control: 17,
  alt: 18,
  // Legacy alias kept for compatibility; standard name is "pause".
  pausebreak: 19,
  pause: 19,
  capslock: 20,
  // Legacy alias kept for compatibility; standard name is "escape".
  esc: 27,
  escape: 27,
  // Legacy alias kept for compatibility; standard name is "spacebar" (non-standard but widely used).
  space: 32,
  spacebar: 32,
  pageup: 33,
  pagedown: 34,
  end: 35,
  home: 36,
  // Legacy aliases kept for compatibility; standard names are "arrowleft/arrowup/arrowright/arrowdown".
  leftarrow: 37,
  arrowleft: 37,
  uparrow: 38,
  arrowup: 38,
  rightarrow: 39,
  arrowright: 39,
  downarrow: 40,
  arrowdown: 40,
  insert: 45,
  delete: 46,
  a: 65,
  b: 66,
  c: 67,
  d: 68,
  e: 69,
  f: 70,
  g: 71,
  h: 72,
  i: 73,
  j: 74,
  k: 75,
  l: 76,
  m: 77,
  n: 78,
  o: 79,
  p: 80,
  q: 81,
  r: 82,
  s: 83,
  t: 84,
  u: 85,
  v: 86,
  w: 87,
  x: 88,
  y: 89,
  z: 90,
  leftwindowkey: 91,
  rightwindowkey: 92,
  meta: metaKeyCodes,
  // Legacy alias kept for compatibility; standard name is "contextmenu".
  selectkey: 93,
  contextmenu: 93,
  numpad0: 96,
  numpad1: 97,
  numpad2: 98,
  numpad3: 99,
  numpad4: 100,
  numpad5: 101,
  numpad6: 102,
  numpad7: 103,
  numpad8: 104,
  numpad9: 105,
  multiply: 106,
  add: 107,
  subtract: 109,
  decimalpoint: 110,
  divide: 111,
  f1: 112,
  f2: 113,
  f3: 114,
  f4: 115,
  f5: 116,
  f6: 117,
  f7: 118,
  f8: 119,
  f9: 120,
  f10: 121,
  f11: 122,
  f12: 123,
  numlock: 144,
  scrolllock: 145,
  semicolon: 186,
  equalsign: 187,
  comma: 188,
  dash: 189,
  period: 190,
  forwardslash: 191,
  graveaccent: 192,
  openbracket: 219,
  backslash: 220,
  closebracket: 221,
  singlequote: 222,
}

type ModifierName = 'ctrl' | 'shift' | 'alt' | 'meta'
type ModifierCheck = (event: KeyboardEvent) => boolean

/**
 * The four modifier predicates, mirrored from upstream's `modifierKey`. Each one reads the event
 * flag and, on `keyup`, additionally falls back to the deprecated `keyCode` — a `keyup` for the
 * modifier itself arrives with its own flag already cleared, so `event.ctrlKey` alone can never see
 * it.
 */
const modifierKey: Record<ModifierName, ModifierCheck> = {
  ctrl: event => event.ctrlKey || (event.type === 'keyup' && event.keyCode === 17),
  shift: event => event.shiftKey || (event.type === 'keyup' && event.keyCode === 16),
  alt: event => event.altKey || (event.type === 'keyup' && event.keyCode === 18),
  meta: event => event.metaKey || (event.type === 'keyup' && metaKeyCodes.includes(event.keyCode)),
}

/** Own-property membership, so a segment named after an `Object.prototype` member is not a modifier. */
function isModifierName(key: string): key is ModifierName {
  return Object.hasOwn(modifierKey, key)
}

/** A key filter is usable when it is a string or a `keyCode` number. */
function isValidKeyType(value: unknown): value is KeyType {
  return typeof value === 'string' || typeof value === 'number'
}

/**
 * How many keys the event identifies as active — upstream's `countKeyByEvent`.
 *
 * The modifier flags are counted first; a `keyCode` in `[16, 17, 18, 91, 92]` **is** a modifier
 * (`16 17 18 91 92 是修饰键的 keyCode`), so it adds nothing further, while every other key counts as one
 * more active key.
 */
function countKeyByEvent(event: KeyboardEvent): number {
  const countOfModifier = Object.values(modifierKey)
    .reduce((total, check) => (check(event) ? total + 1 : total), 0)

  return [16, 17, 18, 91, 92].includes(event.keyCode) ? countOfModifier : countOfModifier + 1
}

/**
 * Match one filter against one event — upstream's `genFilterKey`.
 *
 * A number matches `event.keyCode` directly. A string is split on `.` and **every** segment must
 * match, either as a modifier or as an alias `keyCode`; the matched filter itself is returned
 * (never a bare `true`), which is what lets an array filter tell the handler which entry fired.
 * With `exactMatch`, the event must also carry no extra modifiers (`countKeyByEvent(event) ===
 * genArr.length`).
 */
function genFilterKey(event: KeyboardEvent, keyFilter: KeyType, exactMatch: boolean): KeyType | false {
  // Browsers fire keydown/keyup while autofilling an input without a `key`
  // (`浏览器自动补全 input 的时候... event.key 等为空`); upstream treats those as no match.
  if (!event.key)
    return false

  if (typeof keyFilter === 'number')
    return event.keyCode === keyFilter ? keyFilter : false

  const genArr = keyFilter.split('.')
  let genLen = 0

  for (const key of genArr) {
    const lower = key.toLowerCase()
    // Own-property lookups: upstream indexes both maps through `as any`, so a
    // segment named after an `Object.prototype` member read the prototype
    // (`constructor` matched, `__proto__` even threw). See the JSDoc divergence note.
    const genModifier = isModifierName(key) ? modifierKey[key] : undefined
    const aliasKeyCode = Object.hasOwn(aliasKeyCodeMap, lower) ? aliasKeyCodeMap[lower] : undefined

    if ((genModifier && genModifier(event)) || (aliasKeyCode && aliasKeyCode === event.keyCode))
      genLen++
  }

  /**
   * `genLen === genArr.length` proves every segment matched; `countKeyByEvent(event) ===
   * genArr.length` (with `exactMatch`) additionally proves no other key is active, which is what
   * stops a `ctrl+a` press from also firing a `ctrl` listener.
   */
  if (exactMatch)
    return genLen === genArr.length && countKeyByEvent(event) === genArr.length ? keyFilter : false

  return genLen === genArr.length ? keyFilter : false
}

/**
 * Turn any accepted filter into a predicate — upstream's `genKeyFormatter`. A custom function is
 * used as-is, an array fires on the first matching entry (`Array.prototype.find`, so the *filter*
 * is the value), and the final branch.
 */
function genKeyFormatter(keyFilter: KeyPressFilter, exactMatch: boolean): KeyPressPredicate {
  if (typeof keyFilter === 'function')
    return keyFilter

  if (isValidKeyType(keyFilter))
    return (event: KeyboardEvent) => genFilterKey(event, keyFilter, exactMatch)

  if (Array.isArray(keyFilter))
    return (event: KeyboardEvent) => keyFilter.find(item => genFilterKey(event, item, exactMatch))

  return () => Boolean(keyFilter)
}

const defaultEvents: KeyPressEvent[] = ['keydown']

/**
 * Map from ahooks `useKeyPress`
 * (`source/ahooks/packages/hooks/src/useKeyPress/`).
 *
 * @example
 * useKeyPress('ctrl.a', event => event.preventDefault())
 *
 * // An array fires once and reports which filter matched as `key`:
 * useKeyPress(['c', 'shift.c', 'shift.ctrl.c'], (event, key) => console.log(key))
 *
 * // Exact matching: `ctrl` must not fire while `ctrl+a` is held.
 * useKeyPress('ctrl', handler, { exactMatch: true })
 *
 * // A specific element, other events, capture phase:
 * useKeyPress('escape', handler, { target: panelRef, events: ['keyup'], useCapture: true })
 */
export function useKeyPress(
  keyFilter: KeyPressFilter,
  eventHandler: (event: KeyboardEvent, key: KeyType) => void,
  option?: UseKeyPressOptions,
): void {
  const { events = defaultEvents, target, exactMatch = false, useCapture = false } = option || {}

  // Latest-value refs: upstream reads both through `useLatest`, so a new filter
  // or handler identity never re-binds the listeners and the bound callback
  // always sees the newest ones.
  const eventHandlerRef = useLatest(eventHandler)
  const keyFilterRef = useLatest(keyFilter)

  // ── deep-compare half of upstream's `useDeepCompareEffectWithTarget` ──
  // `events` is deep-compared so an inline array literal stays inert. The state
  // only changes identity when `events` deep-changes, which is exactly the
  // signal upstream's `depsEqual` + counter produces.
  const [stableEvents, setStableEvents] = useState(events)
  useDeepCompareEffect(() => {
    setStableEvents(events)
  }, [events])

  const defaultWindow = typeof window === 'undefined' ? undefined : window

  // ── target-aware half: upstream's `useEffectWithTarget` ──
  // No dependency array on purpose: the effect runs after **every** commit,
  // re-resolves the target (so a ref attached during this commit is seen, and a
  // ref that later points elsewhere is noticed) and re-binds only when the
  // resolved element or the deep-compared `events` actually changed. The
  // previous cleanup is held in a ref and run on unmount by `useUnmount`, so a
  // re-render that changes nothing keeps the current listeners.
  const cleanupRef = useRef<(() => void) | undefined>(undefined)
  const lastElementRef = useRef<EventTarget | null | undefined>(undefined)
  const lastEventsRef = useRef<KeyPressEvent[] | undefined>(undefined)
  const hasBoundRef = useRef(false)

  useEffect(() => {
    // upstream: `if (!target) return defaultElement` then the unwrap — a ref
    // whose `.current` resolves to `null` is not a fallback to `window`.
    const el = target ? unrefElement(target) : defaultWindow

    if (
      hasBoundRef.current
      && Object.is(lastElementRef.current, el)
      && lastEventsRef.current === stableEvents
    ) {
      return
    }

    hasBoundRef.current = true
    lastElementRef.current = el
    lastEventsRef.current = stableEvents

    cleanupRef.current?.()
    cleanupRef.current = undefined

    if (!el)
      return

    const callbackHandler = (event: Event) => {
      const keyEvent = event as KeyboardEvent
      const genGuard = genKeyFormatter(keyFilterRef.current, exactMatch)
      const keyGuard = genGuard(keyEvent)
      const firedKey = isValidKeyType(keyGuard) ? keyGuard : keyEvent.key

      if (keyGuard) {
        eventHandlerRef.current(keyEvent, firedKey)
      }
    }

    for (const eventName of stableEvents)
      el.addEventListener(eventName, callbackHandler, useCapture)

    cleanupRef.current = () => {
      for (const eventName of stableEvents)
        el.removeEventListener(eventName, callbackHandler, useCapture)
    }
  })

  useUnmount(() => {
    cleanupRef.current?.()
    cleanupRef.current = undefined
    // for react-refresh: a remount must init again, not compare against a
    // listener that was already removed (upstream `createEffectWithTarget`)
    hasBoundRef.current = false
  })
}
