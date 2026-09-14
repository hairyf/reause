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
 * Upstream's key-name table, mirrored verbatim so a hotkey string written for mantine keeps
 * matching here: symbolic `event.key` names (`Escape`, `ArrowUp`, the space bar's `' '`) and the `+
 * - * /` operators that cannot be typed into a `+`-separated hotkey without the `[plus]` /
 * `[minus]` spellings.
 *
 * `parseHotkey` reads this case-sensitively against the *event*'s key/code, while a hotkey string
 * is lower-cased before parsing — which is why the escape spellings appear twice (`Escape` for
 * `event.key`, `Esc`/`esc` for a hotkey someone wrote as `Esc`).
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
 * Canonical form of one key token: `'KeyK'` and `'k'` both become `'k'`, the `' '` key becomes
 * `'space'`, `Escape`/`Esc`/`esc` all become `'escape'`. The `Key` prefix strip is what makes a
 * physical hotkey writable both ways for letters (`'KeyA'` and `'A'` normalise alike); it does
 * **not** bridge `'Digit1'` and `'1'`, which stay distinct — an upstream gotcha pinned by the
 * tests.
 */
function normalizeKey(key: string): string {
  const lowerKey = key.replace('Key', '').toLowerCase()
  return keyNameMap[key] || lowerKey
}

/**
 * Map from @mantine/hooks `parseHotkey`
 * (`source/mantine/packages/@mantine/hooks/src/use-hotkeys/`).
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
 * Map from @mantine/hooks `getHotkeyMatcher`
 * (`source/mantine/packages/@mantine/hooks/src/use-hotkeys/`).
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
 * Map from @mantine/hooks `getHotkeyHandler`
 * (`source/mantine/packages/@mantine/hooks/src/use-hotkeys/`).
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
 * Map from @mantine/hooks `useHotkeys`
 * (`source/mantine/packages/@mantine/hooks/src/use-hotkeys/`).
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
     * `triggerOnContentEditable` drops only the `tagsToIgnore` check, otherwise the target must be
     * neither content editable nor a listed tag. A non-`HTMLElement` target (a synthetic dispatch
     * on `document`, or a key event on `window`) is never guarded.
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
