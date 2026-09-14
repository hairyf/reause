---
category: Sensors
---

# useHotkeys

Keyboard shortcuts written as hotkey strings — `mod+K` means `⌘K` on Apple hardware and `Ctrl+K` elsewhere, selected per event with no platform probe.

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
