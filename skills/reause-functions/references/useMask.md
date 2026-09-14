---
category: Browser
---

# useMask

Input masking engine, detached from `@mantine/core` — formats what the user types against a mask pattern and keeps the unmasked characters separately.

## Usage

`useMask` attaches real-time input masking to any native `<input>` element through a callback ref. It formats user input against a defined pattern and exposes both the masked display value and the raw unmasked value, so the hook stays free of any component library.

```tsx
import { useMask } from '@reause/core'

const { ref, value, rawValue, isComplete, reset } = useMask({ mask: '(999) 999-9999' })

// <input ref={ref} placeholder="(___) ___-____" />
// value     -> '(123) 456-7890'  (display)
// rawValue  -> '1234567890'      (unmasked)
```

The mask string defines the expected format. Each character is either a **token** (an editable slot) or a **literal** (a fixed character the mask inserts itself). The built-in tokens are `9` for a digit (`[0-9]`), `a` for a letter (`[A-Za-z]`), `A` for an uppercase letter (`[A-Z]`), `*` for an alphanumeric character (`[A-Za-z0-9]`) and `#` for a sign or digit (`[-+0-9]`). A `\` escapes the next character into a literal, so `\A` is a literal `A` rather than an uppercase-letter slot. Append `?` to make every slot from that point on optional — `(999) 999-9999? x9999` is complete as soon as the required prefix is filled, which is what `isComplete` reports.

`slotChar` (default `"_"`) is the placeholder shown in unfilled slots, and it may be a multi-character string to hint at the expected content. The hint is read at each token slot's own position, so `'DD/MM/YYYY'` on `99/99/9999` lines up with the mask's `/` literals, while a hint whose separators do not line up shows the mask's literals in place of its own. `alwaysShowMask` keeps the pattern visible while the field is empty and unfocused, and `showMaskOnFocus` (default `true`) reveals the placeholders when the field is focused. `transform` converts each character before validation, which is how `AAAA` accepts lowercase input:

```tsx
import { useMask } from '@reause/core'

const { ref, isComplete } = useMask({
  mask: 'AAAA-9999',
  slotChar: 'XXXX-0000',
  transform: char => char.toUpperCase(),
  onComplete: (masked, raw) => console.log('complete', masked, raw),
})

// <input ref={ref} />
// isComplete -> true once every required slot is filled
```

`modify` can swap the mask per keystroke from the current raw value — for example to switch between standard and American Express credit-card formats — and `tokens` overrides or extends the built-in token map. A mask may also be an array mixing string literals and `RegExp` objects, where each entry maps positionally.

`autoClear` empties the field on blur while the mask is incomplete, `invalid` sets `aria-invalid` on the element, `onChangeRaw(rawValue, maskedValue)` fires on every change, and `onComplete(maskedValue, rawValue)` fires once on the transition into completeness. `Ctrl/Cmd+Z` undoes a change, `Ctrl/Cmd+Shift+Z` and `Ctrl+Y` redo it, and the returned `reset` clears the field and both history stacks.

The pure engine behind the hook is exported alongside it: `formatMask(raw, options)` applies a mask to a raw string, `unformatMask(masked, options)` strips the mask literals back out, `isMaskComplete(masked, options)` reports completeness without an element, and `generatePattern(mode, options)` builds a `RegExp` source string for an HTML `pattern` attribute.

```tsx
import { formatMask, isMaskComplete, unformatMask } from '@reause/core'

const options = { mask: '(999) 999-9999' }

formatMask('1234567890', options) // '(123) 456-7890'
unformatMask('(123) 456-7890', options) // '1234567890'
isMaskComplete('(123) 456-7890', options) // true
```

::: warning
`unformatMask` reads the value positionally and does not recognise `slotChar` placeholders, so it works on a value the mask completed but not on a padded display: `unformatMask('12/__', { mask: '99/99' })` is `'12__'`. The hook's own `rawValue` is derived before the display is padded and is not affected.
:::

## Type Declarations

```ts
/**
 * Map from @mantine/hooks `useMask`
 * (`source/mantine/packages/@mantine/hooks/src/use-mask/`).
 */
/**
 * Input masking hook: formats what the user types into `mask` and keeps the unmasked characters in
 * `rawValue`.
 *
 * The returned `ref` is a **callback ref** for a native `<input>`. Attaching it is what wires the
 * hook up: `refCallback` adds the `input`, `focus`, `blur`, `mousedown`, `mouseup`, `keydown` and
 * `paste` listeners to the node, initialises the field from whatever value the node already
 * carries, applies `aria-invalid`, and removes every listener again when React calls it with
 * `null`. The port deliberately stays on a native element — no `@mantine/core`, no `TextInput` — so
 * any input in any component tree can take it.
 *
 * The hook owns the field: `keydown`, `paste` and `input` are intercepted (`preventDefault` on the
 * two it fully handles), the value is rebuilt through the mask, and both the DOM `value` and the
 * caret are written back directly while the React state (`value` / `rawValue`) mirrors them. Typing
 * a character whose slot rejects it is a no-op rather than a rejected keystroke, and the caret
 * skips literals so it always lands on an editable slot.
 *
 * Undo/redo is a two-stack history of `UndoState` entries: `Ctrl/Cmd+Z` undoes, `Ctrl/Cmd+Shift+Z`
 * and `Ctrl+Y` redo, `reset` clears both stacks, and the undo stack is capped at `MAX_UNDO_HISTORY`
 * entries. Each push records the raw value and the current caret so undo restores the editing
 * position too.
 *
 * `alwaysShowMask` and `showMaskOnFocus` are separate switches: the first keeps the pattern visible
 * while the field is empty and unfocused, the second (true by default) is what reveals the
 * placeholders on focus. `autoClear` empties the field on blur while the mask is incomplete; even
 * without it, blurring a field whose raw content is empty clears the display it had shown on focus.
 *
 * `isComplete` reflects the committed value — it is recomputed during render from `processedRef`
 * rather than from the `maskedValue` state, so it stays in step with the DOM write in the same
 * commit.
 */
export declare function useMask(options: UseMaskOptions): UseMaskReturnValue
export {
  DEFAULT_TOKENS,
  formatMask,
  generatePattern,
  isMaskComplete,
  unformatMask,
} from "./engine"
export type {
  MaskSlot,
  MaskState,
  UndoState,
  UseMaskOptions,
  UseMaskReturnValue,
} from "./engine"
```
