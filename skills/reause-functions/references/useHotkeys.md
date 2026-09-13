---
category: Sensors
---

# useHotkeys

Keyboard shortcuts written as hotkey strings — `mod+K` means `⌘K` on Apple hardware and `Ctrl+K` elsewhere, selected per event with no platform probe — with `tagsToIgnore` skipping `INPUT` / `TEXTAREA` / `SELECT` targets (and, by default, anything `contenteditable`) so typing in a field never fires a shortcut. Mirrors `@mantine/hooks`' `useHotkeys` (upstream mapping files: `source/mantine/packages/@mantine/hooks/src/use-hotkeys/use-hotkeys.ts`, 55 LOC, and `source/mantine/packages/@mantine/hooks/src/use-hotkeys/parse-hotkey.ts`, 130 LOC, which carries `parseHotkey` / `getHotkeyMatcher` / `getHotkeyHandler` / `HotkeyItemOptions`) and is verified against the same directory's `parse-hotkey.test.ts` and `use-hotkeys.test.tsx`.

This is the composed-shortcut hook, not another single-key hook: `useKeyStroke` (`useKeyDown` / `useKeyPressed` / `useKeyUp` / `useKeyModifier`) and `useMagicKeys` both match _keys_ — one `event.key`, a list of them, or a reactive pressed-key map you read yourself — and call your code with no focus guard, while this one parses a **shortcut string** once, requires every modifier to match exactly, keeps the input-focus guard on by default, and adds the element-scoped `getHotkeyHandler` for one-off shortcuts inside a component. `useKeyPress` (#949, ahooks, queued) is the sibling to reach for compound/array key matching rather than shortcut strings.

## Usage

```tsx
import { useHotkeys } from '@reause/core'

useHotkeys([
  ['mod+K', () => openSearch()],
  ['shift+alt+T', () => toggleTheme(), { preventDefault: false }],
])
```

Scope a shortcut to a single element with `getHotkeyHandler` — it takes no `tagsToIgnore` guard, because the element it is bound to is the scope:

```tsx
import { getHotkeyHandler } from '@reause/core'

<input onKeyDown={getHotkeyHandler([['mod+Enter', submit]])} />
```

Pass `tagsToIgnore` to change which targets are skipped and `triggerOnContentEditable` to let `contenteditable` targets through. Set `usePhysicalKeys` on an entry to match `event.code` instead of `event.key`, so the shortcut survives a layout change (AZERTY / Dvorak).

## Type Declarations

```ts
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
export declare function parseHotkey(hotkey: string): Hotkey
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
export declare function getHotkeyMatcher(
  hotkey: string,
  usePhysicalKeys?: boolean,
): CheckHotkeyMatch
export interface HotkeyItemOptions {
  /** Call `event.preventDefault()` before running the handler. @default true */
  preventDefault?: boolean
  /** Match against `event.code` (layout-independent) instead of `event.key`. @default false */
  usePhysicalKeys?: boolean
}
export type HotkeyItem = [
  string,
  (event: KeyboardEvent) => void,
  HotkeyItemOptions?,
]
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
export declare function getHotkeyHandler(
  hotkeys: HotkeyItem[],
): (event: ReactKeyboardEvent<HTMLElement> | KeyboardEvent) => void
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
export declare function useHotkeys(
  hotkeys: HotkeyItem[],
  tagsToIgnore?: string[],
  triggerOnContentEditable?: boolean,
): void
export declare namespace useHotkeys {
  type Hotkey = HotkeyItem
}
```
