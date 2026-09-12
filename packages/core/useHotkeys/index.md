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
