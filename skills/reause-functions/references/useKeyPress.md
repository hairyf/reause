---
category: Sensors
---

# useKeyPress

Listen for a key press by `keyCode`, alias or modifier combination, and hand the handler both the event and the key that fired — the reause port of ahooks' [`useKeyPress`](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useKeyPress/index.ts) (upstream mapping files: `source/ahooks/packages/hooks/src/useKeyPress/index.ts`, 276 LOC, its `index.en-US.md` / `index.zh-CN.md` docs, the `__tests__/index.spec.tsx` suite, and `demo/demo1..8.tsx`; the demo files and the zh-CN page were listed but not read for this port, so their content is unverified here).

A filter is a raw `keyCode` number, a string or an array of strings. Strings are split on `.` and **every** segment must match, so `'ctrl.a'` fires only while both `ctrl` and `a` are involved; each segment is either one of the four modifiers (`ctrl`, `shift`, `alt`, `meta`) or one of ~100 aliases from upstream's `aliasKeyCodeMap` (`capslock`, `numpad0`, `arrowleft` / `leftarrow`, `graveaccent`, …) matched against `event.keyCode`. Alias lookup is lower-cased — that is what makes the documented `CapsLock` spelling work, and it is case-insensitive on both sides (`capslock`, `CapsLock` and `CAPSLOCK` are the same filter). Modifiers are read from the event flags, with a `keyup`-only fallback to the deprecated `keyCode` (`16` / `17` / `18` / `91`–`92`), because a modifier's own `keyup` arrives with its flag already cleared. An array filter fires on the first entry that matches and passes **that filter string** to the handler as `key`, which is how a caller tells which of several filters fired (`['c', 'shift.c', 'shift.ctrl.c']` reports `shift.c` for `Shift+C`).

`exactMatch` tightens a match to an exact set of active keys: the event may carry no modifier the filter does not name and no extra key may be down, so a `ctrl` listener stops firing while `ctrl+a` is held and a `c` listener stops firing while `shift` is held. It is off by default, which is upstream's behaviour — without it the _first_ array entry that matches at all wins, so the same `['c', 'shift.c', 'shift.ctrl.c']` array reports `c` for every `c` press.

This hook is an **upgrade of the existing `useKeyStroke`**, and the two are siblings rather than layers: `useKeyStroke` is untouched, and `useKeyPress` reuses the shared primitives it needs (`toValue`, `useLatest`, `useDeepCompareEffect`, `useUnmount`) instead of a shared matcher. The reason is that both accept `string[]` while meaning different things by it. `useKeyStroke` matches `keyFilter.includes(event.key)` — plain `event.key` membership with no modifier or compound support, a single `eventName`, a `passive` flag and a `dedupe` flag, a handler that only receives the event, and a returned stop function; `useKeyPress` resolves every array entry through the `keyCode` / alias / modifier parser, listens to an `events` array with `useCapture`, hands the matched filter to the handler, and returns `void`. Sharing one matcher would therefore have to change one hook's observable behaviour, which this upgrade must not do. The two also differ in what they compare: `useKeyStroke('a')` tests `event.key === 'a'` (layout-aware, so `Shift+A` does not match), while `useKeyPress('a')` tests `keyCode === 65` (so it does). `useKeyStroke` additionally accepts `true` for "any key" and a boolean predicate, while this hook's filter is upstream's (`number | string | (number | string)[] | predicate`).

`options.target` follows the reause DOM convention (AGENTS.md §2): a React ref object (`RefObject`) holding the element, resolved with the shared `unrefElement` and defaulting to `window`; as upstream's `getTargetElement(target, window)`, only a **missing** target falls back to `window`, so a ref that currently holds `null` simply binds nothing. The target is resolved when the effect runs rather than during render, so a ref attached in the same commit is bound. `options.events` (default `['keydown']`) is compared **deeply**, via the merged `@reause/shared` `useDeepCompareEffect` composed with that target-aware effect — upstream spells this as `useDeepCompareEffectWithTarget(effect, [events], target)` (`source/ahooks/packages/hooks/src/utils/useDeepCompareEffectWithTarget.ts`, `createEffectWithTarget.ts`, `domTarget.ts`, `depsEqual.ts`, `isAppleDevice.ts`) — so an inline `['keydown']` literal never re-binds, while a genuinely different event set does. `useCapture` is read when the listeners are bound, exactly as upstream: changing it on its own does not re-bind.

`keyCode` is a deprecated API. It is kept because upstream's aliases _are_ key codes and because callers filter by them, but `event.key` is the modern, layout-aware path — which is why the handler is handed the event as well as the key. One documented divergence from the pin: upstream indexes the modifier and alias maps through `as any`, so a filter segment named after an `Object.prototype` member reached the prototype (`constructor` and `toString` counted as a matched modifier, `__proto__` threw); this port checks own properties, so a pathological segment is inert. Upstream ships a default export; reause exports `useKeyPress` by name, and because the core barrel is one `export *` per hook, the type names are hook-scoped (`UseKeyPressOptions`, `KeyPressTarget`, `KeyPressEvent`, `KeyPressFilter`, `KeyPressPredicate` — `KeyFilter` and `KeyPredicate` are already exported by `useKeyStroke`) with upstream's `KeyType` kept as-is.

## Usage

```tsx
import { useKeyPress } from '@reause/core'

function App() {
  // every segment must match: `ctrl.a` needs ctrl held and keyCode 65
  useKeyPress('ctrl.a', (event) => {
    event.preventDefault()
    console.log('ctrl + a')
  })

  // an array reports the filter that matched as `key`
  useKeyPress(
    ['c', 'shift.c', 'shift.ctrl.c'],
    (event, key) => console.log('matched filter:', key),
    { exactMatch: true },
  )
}
```

Aliases may be mixed with raw key codes, and the filter is read on every render, so an inline predicate or a rebuilt array is fine:

```tsx
useKeyPress('CapsLock', handler) // case-insensitive alias (keyCode 20)
useKeyPress(['numpad0', 'arrowleft'], handler)
useKeyPress([48, 65], handler) // raw keyCodes: '0' and 'a'
useKeyPress(event => event.key === 'Escape', handler)
```

`exactMatch` blocks a superset of modifiers; without it `ctrl` also fires while `ctrl+a` is pressed:

```tsx
useKeyPress('ctrl', handler, { exactMatch: true })
```

`events`, `target` and `useCapture` mirror upstream — an element, a ref, or a resolver, and the capture phase:

```tsx
const panelRef = useRef<HTMLDivElement>(null)

// keydown by default; keyup sees a modifier's own release through its keyCode
useKeyPress('meta', handler, { events: ['keyup'] })

useKeyPress('escape', handler, { target: panelRef })
useKeyPress('escape', handler, { target: panelRef, useCapture: true })
useKeyPress('escape', handler, { target: () => document.body })
```

For the `useKeyStroke` alternative, remember what an array means there: `useKeyStroke(['a', 'b'])` matches `event.key` membership and returns a stop function, while `useKeyPress(['a', 'b'])` resolves both entries through the key-code parser and reports `'a'` or `'b'` to the handler.

## Type Declarations

```ts
/** A keyboard event identifier: either a `keyCode` (number) or a key filter (string). */
export type KeyType = number | string
/** Custom filter: return the matched key to fire with it, or a falsy value to skip the event. */
export type KeyPressPredicate = (
  event: KeyboardEvent,
) => KeyType | boolean | undefined
/** A single key, an array of keys, or a custom predicate. */
export type KeyPressFilter = KeyType | KeyType[] | KeyPressPredicate
export type KeyPressEvent = "keydown" | "keyup"
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
export declare function useKeyPress(
  keyFilter: KeyPressFilter,
  eventHandler: (event: KeyboardEvent, key: KeyType) => void,
  option?: UseKeyPressOptions,
): void
```
