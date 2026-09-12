import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect, useRef } from 'react'

export interface KeyboardModifiers {
  alt: boolean
  ctrl: boolean
  meta: boolean
  mod: boolean
  shift: boolean
}

export interface Hotkey extends KeyboardModifiers {
  key?: string
}

type CheckHotkeyMatch = (event: KeyboardEvent) => boolean

/**
 * Upstream's key-name table, mirrored verbatim so a hotkey string written for
 * mantine keeps matching here: symbolic `event.key` names (`Escape`, `ArrowUp`,
 * the space bar's `' '`) and the `+ - * /` operators that cannot be typed into
 * a `+`-separated hotkey without the `[plus]` / `[minus]` spellings.
 *
 * `parseHotkey` reads this case-sensitively against the *event*'s key/code,
 * while a hotkey string is lower-cased before parsing — which is why the
 * escape spellings appear twice (`Escape` for `event.key`, `Esc`/`esc` for a
 * hotkey someone wrote as `Esc`).
 */
const keyNameMap: Record<string, string> = {
  ' ': 'space',
  'ArrowLeft': 'arrowleft',
  'ArrowRight': 'arrowright',
  'ArrowUp': 'arrowup',
  'ArrowDown': 'arrowdown',
  'Escape': 'escape',
  'Esc': 'escape',
  'esc': 'escape',
  'Enter': 'enter',
  'Tab': 'tab',
  'Backspace': 'backspace',
  'Delete': 'delete',
  'Insert': 'insert',
  'Home': 'home',
  'End': 'end',
  'PageUp': 'pageup',
  'PageDown': 'pagedown',
  '+': 'plus',
  '-': 'minus',
  '*': 'asterisk',
  '/': 'slash',
}

/**
 * Canonical form of one key token: `'KeyK'` and `'k'` both become `'k'`, the
 * `' '` key becomes `'space'`, `Escape`/`Esc`/`esc` all become `'escape'`. The
 * `Key` prefix strip is what makes a physical hotkey writable both ways for
 * letters (`'KeyA'` and `'A'` normalise alike); it does **not** bridge
 * `'Digit1'` and `'1'`, which stay distinct — an upstream gotcha pinned by the
 * tests.
 */
function normalizeKey(key: string): string {
  const lowerKey = key.replace('Key', '').toLowerCase()
  return keyNameMap[key] || lowerKey
}

/**
 * Split a hotkey string into its modifier flags and its single free key.
 *
 * Map from @mantine/hooks `parseHotkey`
 * (`source/mantine/packages/@mantine/hooks/src/use-hotkeys/`, defined in
 * `parse-hotkey.ts`).
 * A direct mirror: the input is lower-cased, split on `+` and trimmed, the five
 * reserved tokens (`alt`, `ctrl`, `meta`, `mod`, `shift`) become flags, and the
 * **first** remaining token is the key. The `\`[plus]\`` spelling maps to `'+'`
 * so a `+` key can be written inside a `+`-separated string.
 *
 * Consequences worth knowing, both upstream behaviour and asserted in the
 * tests: only the first free key survives (`'mod+S+A'` parses to `key: 's'`,
 * `'a'` is dropped), and the key keeps the lower-cased form it was given
 * (`parseHotkey('Escape').key === 'escape'` but `parseHotkey('Esc').key ===
 * 'esc'`) — normalisation happens later, at match time, so both spellings still
 * match a real `Escape` event.
 *
 * @example
 * parseHotkey('mod+shift+K') // { alt: false, ctrl: false, meta: false, mod: true, shift: true, key: 'k' }
 */
export function parseHotkey(hotkey: string): Hotkey {
  const keys = hotkey
    .toLowerCase()
    .split('+')
    .map(part => part.trim())

  const modifiers: KeyboardModifiers = {
    alt: keys.includes('alt'),
    ctrl: keys.includes('ctrl'),
    meta: keys.includes('meta'),
    mod: keys.includes('mod'),
    shift: keys.includes('shift'),
  }

  const reservedKeys = ['alt', 'ctrl', 'meta', 'shift', 'mod']

  const freeKey = keys.find(key => !reservedKeys.includes(key))

  return {
    ...modifiers,
    key: freeKey === '[plus]' ? '+' : freeKey,
  }
}

/**
 * Does one `keydown` event satisfy a parsed hotkey *exactly*?
 *
 * `mod` is deliberately platform-agnostic — see `getHotkeyMatcher`.
 */
function isExactHotkey(hotkey: Hotkey, event: KeyboardEvent, usePhysicalKeys?: boolean): boolean {
  const { alt, ctrl, meta, mod, shift, key } = hotkey
  const { altKey, ctrlKey, metaKey, shiftKey, key: pressedKey, code: pressedCode } = event

  if (alt !== altKey) {
    return false
  }

  if (mod) {
    if (!ctrlKey && !metaKey) {
      return false
    }
  }
  else {
    if (ctrl !== ctrlKey) {
      return false
    }
    if (meta !== metaKey) {
      return false
    }
  }
  if (shift !== shiftKey) {
    return false
  }

  if (
    key
    && (usePhysicalKeys
      ? normalizeKey(pressedCode) === normalizeKey(key)
      : normalizeKey(pressedKey ?? pressedCode) === normalizeKey(key))
  ) {
    return true
  }

  return false
}

/**
 * Build the predicate that matches one hotkey string against `KeyboardEvent`s.
 *
 * Map from @mantine/hooks `getHotkeyMatcher`
 * (`source/mantine/packages/@mantine/hooks/src/use-hotkeys/`, defined in
 * `parse-hotkey.ts`).
 * Parsing happens once, when the matcher is created — not per event.
 *
 * Matching is **exact on every modifier**: a hotkey with no `alt` does not match
 * an event carrying `altKey`, so `'shift+alt+O'` does not fire on
 * `Ctrl+Alt+Shift+O`. `mod` is the one exception, and deliberately so: it
 * matches when **either** `ctrlKey` or `metaKey` is held. That single branch is
 * what makes `'mod+K'` mean `⌘K` on Apple hardware and `Ctrl+K` elsewhere,
 * with no platform probe at all — a Mac sends `metaKey`, every other platform
 * sends `ctrlKey`, and neither needs to be told which machine it runs on. There
 * is therefore no `navigator` read at module scope (or anywhere else) to guard
 * for SSR; `getHotkeyMatcher` is a pure function of the hotkey string, and the
 * cost is upstream's own permissiveness: on a Mac `Ctrl+K` also matches
 * `'mod+K'`, exactly as mantine behaves.
 *
 * `usePhysicalKeys` selects the layout-independent `event.code` instead of
 * `event.key`, so `'mod+k'` keeps working on an AZERTY/Dvorak layout where the
 * physical K cap prints another character. Off (the default), `event.key` wins
 * and only falls back to `code` when a synthetic event carries no `key`.
 *
 * @example
 * getHotkeyMatcher('ctrl+alt+I')(new KeyboardEvent('keydown', { ctrlKey: true, altKey: true, key: 'I' })) // true
 */
export function getHotkeyMatcher(hotkey: string, usePhysicalKeys?: boolean): CheckHotkeyMatch {
  return event => isExactHotkey(parseHotkey(hotkey), event, usePhysicalKeys)
}

export interface HotkeyItemOptions {
  /** Call `event.preventDefault()` before running the handler. @default true */
  preventDefault?: boolean
  /** Match against `event.code` (layout-independent) instead of `event.key`. @default false */
  usePhysicalKeys?: boolean
}

export type HotkeyItem = [string, (event: KeyboardEvent) => void, HotkeyItemOptions?]

/**
 * Turn a hotkey list into a `keydown` handler for a *single element*.
 *
 * Map from @mantine/hooks `getHotkeyHandler`
 * (`source/mantine/packages/@mantine/hooks/src/use-hotkeys/`, defined in
 * `parse-hotkey.ts`).
 * Spread the result onto `onKeyDown` to scope shortcuts to one element instead
 * of the document:
 *
 * ```tsx
 * <input onKeyDown={getHotkeyHandler([['mod+Enter', submit]])} />
 * ```
 *
 * Accepts both React's synthetic event and a native `KeyboardEvent`, unwrapping
 * `event.nativeEvent` when present, so the same handler works from `onKeyDown`
 * and from a manual `addEventListener`. Unlike `useHotkeys` it applies **no
 * `tagsToIgnore` / contentEditable guard** — the element it is bound to is the
 * scope, which is the point. Per-item `preventDefault` defaults to `true`, so
 * `getHotkeyHandler` with no options calls `preventDefault()` on the element
 * event (that is what stops the keystroke from also reaching the document).
 */
export function getHotkeyHandler(hotkeys: HotkeyItem[]) {
  return (event: ReactKeyboardEvent<HTMLElement> | KeyboardEvent) => {
    const _event = 'nativeEvent' in event ? event.nativeEvent : event
    hotkeys.forEach(
      ([hotkey, handler, options = { preventDefault: true, usePhysicalKeys: false }]) => {
        if (getHotkeyMatcher(hotkey, options.usePhysicalKeys)(_event)) {
          if (options.preventDefault) {
            event.preventDefault()
          }

          handler(_event)
        }
      },
    )
  }
}

/**
 * Attach global keyboard shortcuts, written as hotkey strings.
 *
 * Map from @mantine/hooks `useHotkeys`
 * (`source/mantine/packages/@mantine/hooks/src/use-hotkeys/`) — the **whole
 * directory** is ported, not only upstream's 55-line `use-hotkeys.ts`:
 * `parse-hotkey.ts` (`parseHotkey`, `getHotkeyMatcher`, `getHotkeyHandler`,
 * `HotkeyItemOptions`) is the matching engine and the substance of this hook.
 * Upstream splits the two files because its `parse-hotkey.ts` is standalone;
 * here they are merged into one `index.tsx`, the repo's one-module-per-hook
 * layout (the two `Map from` annotations above keep the per-export provenance
 * resolvable for issue #915). The public surface is otherwise kept 1:1 — the
 * same signature, the same `HotkeyItem` / `HotkeyItemOptions` / `Hotkey` types,
 * the `useHotkeys.Hotkey` namespace alias, and `getHotkeyHandler` exported from
 * the barrel exactly as upstream re-exports it from the hook directory. Named
 * exports only, as this repo's convention requires; upstream's namespace alias
 * is the one addition kept for API parity.
 *
 * Installs one `keydown` listener on `document.documentElement` at mount and
 * removes it on unmount. Each entry is `[hotkey, handler, options?]`; when
 * several entries match the same event **all** of their handlers run, in list
 * order, because upstream iterates the list with `forEach` rather than stopping
 * at the first match.
 *
 * Defaults are preserved verbatim from upstream:
 *
 * - `tagsToIgnore = ['INPUT', 'TEXTAREA', 'SELECT']` — events whose `target` is
 *   one of these tags are skipped, so typing `k` in a text field never fires
 *   `'k'`. This input-focus guard is a headline feature, not an afterthought.
 * - `triggerOnContentEditable = false` — a `contenteditable` target is skipped
 *   unless you opt in. Upstream's ordering is preserved exactly: with the flag
 *   set, only `tagsToIgnore` is consulted (a `contenteditable` `<input>` is
 *   still ignored); with it unset, a target is skipped when it is content
 *   editable **or** one of `tagsToIgnore`.
 * - per item `{ preventDefault: true, usePhysicalKeys: false }`.
 *
 * Hotkey strings are the differentiator against the existing key hooks in this
 * package. `useKeyStroke` (`useKeyDown` / `useKeyPressed` / `useKeyUp` /
 * `useKeyModifier`) and `useMagicKeys` both match *keys* — a single `event.key`,
 * a list of them, or a reactive pressed-key map you read yourself — and call
 * your code unconditionally with no focus guard. This hook matches a
 * **composed shortcut** (`'mod+K'`, `'shift+alt+T'`), parses it once, enforces
 * exact modifiers, skips input-like targets by default, and adds the
 * element-scoped `getHotkeyHandler` variant for one-off shortcuts inside a
 * component. `useKeyPress` (#949, ahooks, queued) is the sibling for
 * compound/array key matching when you want key lists rather than shortcut
 * strings.
 *
 * **Freshness (deliberate divergence from upstream's mechanism).** Upstream
 * wraps the listener in React 19.2's `useEffectEvent`. This port uses the
 * repo's classic latest-value refs instead — the same semantics (the listener
 * is registered once and always calls the newest `hotkeys` / guards) without
 * taking a hard dependency on a hook that only exists in React 19.2+:
 * `packages/core/package.json` declares `peerDependencies.react: ">=18"`, and
 * `useEffectEvent` is 19.2-only, so mirroring it would make `useHotkeys` throw
 * on React 18 while the rest of the barrel keeps working — an undeclared floor
 * bump this port cannot make from inside one hook file. The refs are written
 * during render, so the mount-bound listener never needs to re-subscribe; this
 * is the established pattern in `useKeyStroke` and the other hooks here.
 * `StrictMode` safety is *not* claimed: no render-phase one-shot flag is used,
 * and the effect is a plain add/remove pair, which is idempotent under React's
 * double-invoked effects.
 *
 * **SSR-safe.** Nothing touches `document` (or `navigator`) during render or at
 * module scope; the listener is bound in the mount effect, which never runs on
 * the server. Hotkeys are simply inert until hydration.
 *
 * @see https://mantine.dev/hooks/use-hotkeys/
 *
 * @example
 * useHotkeys([
 *   ['mod+K', () => openSearch()],
 *   ['shift+alt+T', () => toggleTheme(), { preventDefault: false }],
 * ])
 *
 * // scoped to one element, no input guard needed
 * <input onKeyDown={getHotkeyHandler([['mod+Enter', submit]])} />
 */
export function useHotkeys(
  hotkeys: HotkeyItem[],
  tagsToIgnore: string[] = ['INPUT', 'TEXTAREA', 'SELECT'],
  triggerOnContentEditable = false,
): void {
  // latest-value refs synced each render so the mount-bound listener always
  // reads the newest hotkey list and guards — no re-subscription, no stale
  // closure (the repo's stand-in for upstream's `useEffectEvent`)
  const hotkeysRef = useRef(hotkeys)
  const tagsToIgnoreRef = useRef(tagsToIgnore)
  const triggerOnContentEditableRef = useRef(triggerOnContentEditable)

  hotkeysRef.current = hotkeys
  tagsToIgnoreRef.current = tagsToIgnore
  triggerOnContentEditableRef.current = triggerOnContentEditable

  useEffect(() => {
    /**
     * Should this event reach the handlers at all? Upstream's exact order:
     * `triggerOnContentEditable` drops only the `tagsToIgnore` check, otherwise
     * the target must be neither content editable nor a listed tag. A
     * non-`HTMLElement` target (a synthetic dispatch on `document`, or a key
     * event on `window`) is never guarded.
     */
    function shouldFireEvent(event: KeyboardEvent): boolean {
      const target = event.target
      if (target instanceof HTMLElement) {
        if (triggerOnContentEditableRef.current) {
          return !tagsToIgnoreRef.current.includes(target.tagName)
        }

        return !target.isContentEditable && !tagsToIgnoreRef.current.includes(target.tagName)
      }

      return true
    }

    function handleKeydown(event: KeyboardEvent): void {
      hotkeysRef.current.forEach(
        ([hotkey, handler, options = { preventDefault: true, usePhysicalKeys: false }]) => {
          if (
            getHotkeyMatcher(hotkey, options.usePhysicalKeys)(event)
            && shouldFireEvent(event)
          ) {
            if (options.preventDefault) {
              event.preventDefault()
            }

            handler(event)
          }
        },
      )
    }

    document.documentElement.addEventListener('keydown', handleKeydown)
    return () => document.documentElement.removeEventListener('keydown', handleKeydown)
  }, [])
}

// Upstream surfaces the item tuple a second time as `useHotkeys.Hotkey`, and
// mantine code in the wild spells the type that way. Kept for API parity — the
// repo's one deliberate lint exception rather than a silent API omission.
// eslint-disable-next-line ts/no-namespace
export namespace useHotkeys {
  export type Hotkey = HotkeyItem
}
