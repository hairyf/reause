/**
 * Map from mantine `use-mask/`
 *
 * Pure masking engine plus the exported helpers, ported from
 * `@mantine/hooks`' `use-mask`. The `useMask` hook body, its callback ref and
 * its DOM wiring are added on top of this module.
 */
import type * as React from 'react'

/**
 * Default token map used by `parseMask` when the caller does not override a
 * token. Keyed by the single character that occupies a slot in the mask
 * pattern.
 *
 * The patterns are ported verbatim from the pin, so `regexp/prefer-d`
 * (`[0-9]` → `\d`) and `regexp/use-ignore-case` (`[A-Za-z]` → `/i`) are
 * suppressed here on purpose: `generatePattern` emits `RegExp.prototype.source`
 * straight into the generated pattern, so rewriting these changes observable
 * output. `generatePattern('full', { mask: '9' })` must keep containing
 * `[0-9]`, which is exactly what the pin's own test asserts.
 */
/* eslint-disable regexp/prefer-d, regexp/use-ignore-case */
export const DEFAULT_TOKENS: Record<string, RegExp> = {
  '9': /[0-9]/,
  'a': /[A-Za-z]/,
  'A': /[A-Z]/,
  '*': /[A-Za-z0-9]/,
  '#': /[-+0-9]/,
}
/* eslint-enable regexp/prefer-d, regexp/use-ignore-case */

export interface UseMaskOptions {
  /** Mask pattern string or array of string literals and RegExp objects */
  mask: string | Array<string | RegExp>

  /** Override or extend the default token map */
  tokens?: Record<string, RegExp>

  /** Called before masking on each keystroke, can return overrides for mask options */
  modify?: (
    value: string,
  ) => Partial<Pick<UseMaskOptions, 'mask' | 'tokens' | 'slotChar' | 'separate'>> | undefined

  /** When true, raw and display values are decoupled */
  separate?: boolean

  /** Character displayed in unfilled slots, `"_"` by default */
  slotChar?: string | null

  /** Show mask pattern even when field is empty and unfocused */
  alwaysShowMask?: boolean

  /** Show mask placeholder on focus, `true` by default */
  showMaskOnFocus?: boolean

  /** Transform each character before validation and insertion */
  transform?: (char: string) => string

  /** Clear value on blur when mask is incomplete, `false` by default */
  autoClear?: boolean

  /** Sets aria-invalid on the input */
  invalid?: boolean

  /** Called on every change with raw and masked values */
  onChangeRaw?: (rawValue: string, maskedValue: string) => void

  /** Called when all required mask slots are filled */
  onComplete?: (maskedValue: string, rawValue: string) => void

  /** Escape hatch for advanced cursor/value manipulation */
  beforeMaskedStateChange?: (states: {
    previousState: MaskState
    currentState: MaskState
    nextState: MaskState
  }) => MaskState
}

export interface MaskState {
  value: string
  selection: { start: number, end: number } | null
}

export interface UseMaskReturnValue {
  /** Ref to attach to the input element */
  ref: React.RefCallback<HTMLInputElement>

  /** Current masked display value */
  value: string

  /** Current raw unmasked value */
  rawValue: string

  /** Whether all required mask slots are filled */
  isComplete: boolean

  /** Clear the input value and reset state */
  reset: () => void
}

/**
 * One position of a parsed mask. `type: 'token'` positions accept input
 * (validated by `pattern`); `type: 'literal'` positions are fixed characters
 * the mask writes itself. `optional` is set by a `?` marker in the pattern and
 * only affects `checkComplete`.
 */
export interface MaskSlot {
  type: 'token' | 'literal'
  char: string
  pattern?: RegExp
  optional?: boolean
}

/**
 * Parse a mask into slots.
 *
 * A `\` escapes the following character, turning it into a literal — the
 * escape marker itself is dropped, so `\A` yields the literal `A` rather than
 * both characters. A `?` is consumed and sets an `optional` flag that is
 * **never reset**, so it marks the next emitted slot and every slot after it:
 * `'9?9'` yields `[false, true]` and `'9??99'` yields `[false, true, true]`.
 * That sticky behaviour is what makes the pin's `'(999) 999-9999? x9999'`
 * complete on the required prefix alone.
 *
 * The `\` branch also advances `i` inside the loop body, and the `for`
 * increment then advances it again, so the character immediately after an
 * escaped literal is **skipped** rather than emitted as its own slot:
 * `parseMask('\\A99')` yields two slots, not three. This is the pin's
 * behaviour, preserved deliberately.
 *
 * For an array mask each entry maps positionally: a `RegExp` entry becomes a
 * token with no meaningful `char` (`'_'`) and a string entry becomes a literal,
 * so array masks cannot express optional slots.
 */
export function parseMask(
  mask: string | Array<string | RegExp>,
  tokens: Record<string, RegExp>,
): MaskSlot[] {
  if (Array.isArray(mask)) {
    return mask.map((item) => {
      if (item instanceof RegExp) {
        return { type: 'token', char: '_', pattern: item }
      }
      return { type: 'literal', char: item }
    })
  }

  const slots: MaskSlot[] = []
  let optional = false

  for (let i = 0; i < mask.length; i++) {
    const char = mask[i]

    if (char === '\\' && i + 1 < mask.length) {
      i++
      slots.push({ type: 'literal', char: mask[i] })
      continue
    }

    if (char === '?') {
      optional = true
      continue
    }

    if (tokens[char]) {
      slots.push({ type: 'token', char, pattern: tokens[char], optional })
    }
    else {
      slots.push({ type: 'literal', char, optional })
    }
  }

  return slots
}

/**
 * Resolve the placeholder written into the un-filled slot at `index`.
 *
 * A multi-character `slotChar` is consumed positionally — `slotChar:
 * 'DD/MM/YYYY'` walks the string as the mask is filled — and falls back to
 * `'_'` once the string runs out. `null` and `''` both disable placeholders,
 * which terminates `buildDisplayValue` at the first empty slot rather than
 * padding the rest of the mask.
 */
export function getSlotChar(slotCharOption: string | null | undefined, index: number): string {
  if (slotCharOption === null || slotCharOption === '' || slotCharOption === undefined) {
    return ''
  }
  if (slotCharOption.length > 1) {
    return slotCharOption[index] || '_'
  }
  return slotCharOption
}

/**
 * Lay `raw` onto `slots`, filling each token slot with the first character at
 * or after the current raw index that the slot's pattern accepts. Characters
 * the pattern rejects are skipped (the raw index advances, the slot is retried
 * against the next character), and the loop stops at the first token slot left
 * unfilled once the raw input runs out. Applied to an empty raw value the mask
 * therefore stops after its leading literal — `applyMaskToRaw('', PHONE, '_')`
 * is `'('`.
 *
 * The slot walk has the same double-advance as `parseMask` where the pin
 * decrements `slotIndex` and lets the `for` increment rebalance it: this port
 * keeps the index inside a `while` instead, so a rejected character retries the
 * same slot without a rewind. The observable results are identical. Literal
 * slots are written unconditionally, so the result can end in literals —
 * `formatMask('123', { mask: '(999) 999-9999' })` is `'(123) '`.
 *
 * `transform` is applied per character *before* the pattern test, so it can
 * widen what a slot accepts but cannot make a literal match input.
 *
 * Note the third parameter is `_`-prefixed and unused, matching the pin.
 */
export function applyMaskToRaw(
  raw: string,
  slots: MaskSlot[],
  _slotCharOption: string | null | undefined,
  transform?: (char: string) => string,
): string {
  let result = ''
  let rawIndex = 0
  let slotIndex = 0

  while (slotIndex < slots.length) {
    const slot = slots[slotIndex]

    if (slot.type === 'literal') {
      result += slot.char
      slotIndex++
    }
    else if (rawIndex < raw.length) {
      const ch = transform ? transform(raw[rawIndex]) : raw[rawIndex]
      if (slot.pattern && slot.pattern.test(ch)) {
        result += ch
        rawIndex++
        slotIndex++
      }
      else {
        rawIndex++
      }
    }
    else {
      break
    }
  }

  return result
}

/**
 * Pad `value` with the mask literals and slot placeholders up to
 * `slots.length`. Walks positionally from `value.length`, so `value` is
 * assumed to be a prefix of the masked result.
 *
 * When placeholders are disabled (`null` or `''`) `getSlotChar` returns `''`
 * and the loop stops at the first token slot, but the literals already emitted
 * stay: `buildDisplayValue('', PHONE, null, true)` is `'('`, not `''`. Only
 * when the disabled token slot is reached before any literal — an array mask
 * starting with a token — is the result empty.
 */
export function buildDisplayValue(
  value: string,
  slots: MaskSlot[],
  slotCharOption: string | null | undefined,
  showSlots: boolean,
): string {
  if (!showSlots) {
    return value
  }

  let display = value

  for (let i = value.length; i < slots.length; i++) {
    const slot = slots[i]
    if (slot.type === 'literal') {
      display += slot.char
    }
    else {
      const sc = getSlotChar(slotCharOption, i)
      if (!sc) {
        break
      }
      display += sc
    }
  }

  return display
}

/**
 * Pull the raw value back out of a masked value by keeping the characters
 * that sit at token positions. Reads positionally and truncates at whichever
 * of `masked` or `slots` is shorter, so it never validates — a literal typed
 * where the mask expects a token is still counted as raw.
 */
export function extractRaw(masked: string, slots: MaskSlot[]): string {
  let raw = ''
  for (let i = 0; i < masked.length && i < slots.length; i++) {
    if (slots[i].type === 'token') {
      raw += masked[i]
    }
  }
  return raw
}

/**
 * Report whether every required (non-`optional`) token slot has been filled
 * with a character its pattern accepts. Optional token slots are ignored
 * entirely, so `'(999) 999-9999? x9999'` is complete as soon as the required
 * prefix is.
 */
export function checkComplete(masked: string, slots: MaskSlot[]): boolean {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].type === 'token' && !slots[i].optional) {
      if (i >= masked.length) {
        return false
      }
      if (!slots[i].pattern!.test(masked[i])) {
        return false
      }
    }
  }
  return true
}

/**
 * Index of the first token slot at or after `from`, or `slots.length` when
 * there is none. Returning the sentinel rather than `-1` lets the hook use the
 * result directly as a caret position.
 */
export function findNextTokenIndex(slots: MaskSlot[], from: number): number {
  for (let i = from; i < slots.length; i++) {
    if (slots[i].type === 'token') {
      return i
    }
  }
  return slots.length
}

/**
 * Index of the nearest token slot at or before `from`, or `-1` when there is
 * none.
 */
export function findPrevTokenIndex(slots: MaskSlot[], from: number): number {
  for (let i = from; i >= 0; i--) {
    if (slots[i].type === 'token') {
      return i
    }
  }
  return -1
}

/**
 * Advance `from` past literal slots, stopping at the first token slot, at the
 * end of the mask, or at the end of `value`. Used to park the caret on an
 * editable position instead of on a separator.
 */
export function findNextEditablePosition(from: number, slots: MaskSlot[], value: string): number {
  let pos = from
  while (pos < slots.length && pos < value.length && slots[pos] && slots[pos].type === 'literal') {
    pos++
  }
  return pos
}

/**
 * Re-run a whole masked value through the mask, dropping anything that does not
 * belong. Each token slot scans forward through `inputValue` for the first
 * character its pattern accepts, so a rejected character is discarded rather
 * than ending the walk. Literal slots are always emitted, and consume the
 * matching character from the input when one is sitting there.
 *
 * Two separate exits stop the walk, and which one fires depends on the mask:
 *
 * - at a token slot once `inputIndex` has consumed all of `inputValue`;
 * - the `result.length <= slotIndex` guard, which fires only when every slot
 *   emitted so far appended exactly one character — i.e. for a mask with no
 *   leading literal. A leading literal makes `result.length` exceed `slotIndex`
 *   immediately and the guard can never fire again, so a mask like `'(AAA)'`
 *   applied to `'1'` returns `'('` rather than `'()'`.
 *
 * The practical consequence is that an empty input still yields the leading
 * literal: `processInput('', PHONE, '_')` is `'('`.
 *
 * Like the pin's other pattern tests, this calls `RegExp.prototype.test`
 * without resetting `lastIndex`, so a caller-supplied token carrying the `g`
 * or `y` flag will behave statefully across calls. The pin has the same
 * behaviour; it is documented here rather than changed.
 */
export function processInput(
  inputValue: string,
  slots: MaskSlot[],
  _slotCharOption: string | null | undefined,
): string {
  let result = ''
  let inputIndex = 0

  for (
    let slotIndex = 0;
    slotIndex < slots.length && inputIndex <= inputValue.length;
    slotIndex++
  ) {
    const slot = slots[slotIndex]

    if (slot.type === 'literal') {
      result += slot.char
      if (inputIndex < inputValue.length && inputValue[inputIndex] === slot.char) {
        inputIndex++
      }
      continue
    }

    if (inputIndex >= inputValue.length) {
      break
    }

    while (inputIndex < inputValue.length) {
      const ch = inputValue[inputIndex]
      inputIndex++

      if (slot.pattern!.test(ch)) {
        result += ch
        break
      }
    }

    if (result.length <= slotIndex) {
      break
    }
  }

  return result
}

/**
 * Merge the caller's options with the defaults and resolve `modify` against
 * `rawValue`, returning everything the mask pipeline needs.
 *
 * `slotChar` defaults to `'_'` only when the option is `undefined`; an explicit
 * `null` or `''` survives and disables placeholders. `separate` defaults to
 * `false`. `tokens` is a fresh object per call, so `modify`'s `tokens` override
 * is applied to the copy and never mutates `DEFAULT_TOKENS` or the caller's
 * map.
 */
export function getResolvedOptions(
  options: UseMaskOptions,
  rawValue: string,
): {
  slots: MaskSlot[]
  slotChar: string | null | undefined
  separate: boolean
  tokens: Record<string, RegExp>
  transform: ((char: string) => string) | undefined
} {
  const tokens = { ...DEFAULT_TOKENS, ...options.tokens }
  let mask = options.mask
  let slotChar: string | null | undefined = options.slotChar === undefined ? '_' : options.slotChar
  let separate = options.separate ?? false

  if (options.modify) {
    const overrides = options.modify(rawValue)
    if (overrides) {
      if (overrides.mask !== undefined) {
        mask = overrides.mask
      }
      if (overrides.tokens !== undefined) {
        Object.assign(tokens, overrides.tokens)
      }
      if (overrides.slotChar !== undefined) {
        slotChar = overrides.slotChar
      }
      if (overrides.separate !== undefined) {
        separate = overrides.separate
      }
    }
  }

  const slots = parseMask(mask, tokens)
  return { slots, slotChar, separate, tokens, transform: options.transform }
}

/**
 * Format a raw value into its masked display value.
 */
export function formatMask(raw: string, options: UseMaskOptions): string {
  const { slots, slotChar, transform } = getResolvedOptions(options, raw)
  return applyMaskToRaw(raw, slots, slotChar, transform)
}

/**
 * Strip the mask literals from a masked value, returning the raw value.
 */
export function unformatMask(masked: string, options: UseMaskOptions): string {
  const { slots } = getResolvedOptions(options, '')
  return extractRaw(masked, slots)
}

/**
 * Report whether a masked value fills every required slot of the mask.
 */
export function isMaskComplete(masked: string, options: UseMaskOptions): boolean {
  const { slots } = getResolvedOptions(options, '')
  return checkComplete(masked, slots)
}

/**
 * Build a regular-expression source string for the mask.
 *
 * `'full'` wraps each token in a capturing group and marks optionals with
 * `(src)?`; `'full-inexact'` emits the raw source and marks optionals with
 * `src?`. Literals are escaped, so a mask of `'(999)'` yields `\(` and `\)`.
 */
export function generatePattern(mode: 'full' | 'full-inexact', options: UseMaskOptions): string {
  const { slots } = getResolvedOptions(options, '')
  let pattern = ''

  for (const slot of slots) {
    if (slot.type === 'literal') {
      pattern += slot.char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    else {
      const src = slot.pattern!.source
      if (mode === 'full-inexact') {
        pattern += slot.optional ? `${src}?` : src
      }
      else {
        pattern += slot.optional ? `(${src})?` : `(${src})`
      }
    }
  }

  return pattern
}
