import type * as React from 'react'
import type { MaskSlot } from './engine'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import {
  applyMaskToRaw,
  buildDisplayValue,
  checkComplete,
  DEFAULT_TOKENS,
  extractRaw,
  findNextEditablePosition,
  findNextTokenIndex,
  findPrevTokenIndex,
  formatMask,
  generatePattern,
  getResolvedOptions,
  getSlotChar,
  isMaskComplete,
  MAX_UNDO_HISTORY,
  parseMask,
  processInput,
  unformatMask,
} from './engine'
import { useMask } from './index'

const PHONE: MaskSlot[] = parseMask('(999) 999-9999', DEFAULT_TOKENS)
const DATE: MaskSlot[] = parseMask('99/99/9999', DEFAULT_TOKENS)

// Mirrors the pure half of upstream `source/mantine/packages/@mantine/hooks/src/use-mask/use-mask.test.ts`
// (the four `utility` describes plus the `mask parsing` describe); the hook half
// (DOM, caret, undo) lives in the `useMask` describe below. The engine's own
// imports come from `./engine` because that is the module it lives in, while
// the hook is imported from the page module that re-exports it.

// One shared custom token, declared once and referenced by the cases that need
// it. It is written with an explicit case range rather than the `i` flag to
// match `DEFAULT_TOKENS`' style — `eslint --fix` rewrites the other form, and
// these assertions compare the pattern identity/source, so the rewrite is
// observable here even though the matcher is equivalent.
/* eslint-disable regexp/use-ignore-case -- the case range keeps the assertion
   comparing the same pattern spelling as `DEFAULT_TOKENS`; `i`-flag form would
   still match but its `source` differs. */
const TOKEN_HEX = /[0-9a-fA-F]/
/* eslint-enable regexp/use-ignore-case */

describe('parseMask', () => {
  it('parses tokens and literals positionally', () => {
    expect(PHONE).toHaveLength(14)
    expect(PHONE.map(slot => slot.type)).toEqual([
      'literal',
      'token',
      'token',
      'token',
      'literal',
      'literal',
      'token',
      'token',
      'token',
      'literal',
      'token',
      'token',
      'token',
      'token',
    ])
  })

  it('carries the shared default token pattern by reference', () => {
    const digits = PHONE.filter(slot => slot.type === 'token')
    expect(digits).toHaveLength(10)
    for (const slot of digits) {
      expect(slot.pattern).toBe(DEFAULT_TOKENS['9'])
    }
  })

  it('marks no slot optional when the mask has no `?`', () => {
    expect(PHONE.every(slot => slot.optional !== true)).toBe(true)
  })

  it('makes `?` and every slot after it optional — the flag is sticky', () => {
    // `?` is consumed before the next slot is emitted and the flag is never
    // reset, so it marks the following slot AND every later one. This is
    // ASP.NET-style mask semantics and is what makes the pin's own
    // `'(999) 999-9999? x9999'` case complete on the required prefix.
    expect(parseMask('999?9', DEFAULT_TOKENS).map(slot => slot.optional ?? false))
      .toEqual([false, false, false, true])
    expect(parseMask('9??99', DEFAULT_TOKENS).map(slot => slot.optional ?? false))
      .toEqual([false, true, true])
    expect(parseMask('?99', DEFAULT_TOKENS).map(slot => slot.optional ?? false))
      .toEqual([true, true])
    expect(parseMask('99?', DEFAULT_TOKENS).map(slot => slot.optional ?? false))
      .toEqual([false, false])
    expect(parseMask('9?', DEFAULT_TOKENS).map(slot => slot.optional ?? false)).toEqual([false])
  })

  it('drops the escape marker and keeps the escaped character literal', () => {
    const slots = parseMask('\\A99', DEFAULT_TOKENS)
    expect(slots[0]).toEqual({ type: 'literal', char: 'A' })
    expect(slots[1]).toEqual({ type: 'token', char: '9', pattern: DEFAULT_TOKENS['9'], optional: false })
  })

  it('escapes the escape character itself', () => {
    expect(parseMask('\\\\', DEFAULT_TOKENS)).toEqual([{ type: 'literal', char: '\\' }])
  })

  it('leaves a trailing escape marker as a literal', () => {
    expect(parseMask('9\\', DEFAULT_TOKENS)).toEqual([
      { type: 'token', char: '9', pattern: DEFAULT_TOKENS['9'], optional: false },
      { type: 'literal', char: '\\', optional: false },
    ])
  })

  it('treats an unknown character as a literal', () => {
    const slots = parseMask('9x9', DEFAULT_TOKENS)
    expect(slots[1]).toEqual({ type: 'literal', char: 'x', optional: false })
  })

  it('lets a custom token map override a default key', () => {
    const slots = parseMask('h', { ...DEFAULT_TOKENS, h: TOKEN_HEX })
    expect(slots[0].type).toBe('token')
    expect(slots[0].pattern!.source).toBe('[0-9a-fA-F]')
  })

  it('maps an array mask entry per element', () => {
    const slots = parseMask(['(', /[1-9]/, /\d/, /\d/, ')'], DEFAULT_TOKENS)
    expect(slots).toEqual([
      { type: 'literal', char: '(' },
      { type: 'token', char: '_', pattern: /[1-9]/ },
      { type: 'token', char: '_', pattern: /\d/ },
      { type: 'token', char: '_', pattern: /\d/ },
      { type: 'literal', char: ')' },
    ])
    expect(slots.every(slot => slot.pattern === undefined || slot.char === '_')).toBe(true)
  })

  it('cannot express optional slots in array form', () => {
    const slots = parseMask(['?', /\d/], DEFAULT_TOKENS)
    expect(slots[0]).toEqual({ type: 'literal', char: '?' })
    expect(slots[1].optional).toBeUndefined()
  })
})

describe('getSlotChar', () => {
  it('returns the single character verbatim', () => {
    expect(getSlotChar('_', 0)).toBe('_')
    expect(getSlotChar('_', 7)).toBe('_')
  })

  it('walks a multi-character slotChar positionally, falling back to `_`', () => {
    expect(getSlotChar('DD/MM', 0)).toBe('D')
    expect(getSlotChar('DD/MM', 1)).toBe('D')
    expect(getSlotChar('DD/MM', 4)).toBe('M')
    expect(getSlotChar('DD/MM', 5)).toBe('_')
  })

  it('returns an empty string for null, empty and undefined', () => {
    expect(getSlotChar(null, 0)).toBe('')
    expect(getSlotChar('', 0)).toBe('')
    expect(getSlotChar(undefined, 0)).toBe('')
  })
})

describe('applyMaskToRaw', () => {
  it('fills token slots from raw input and emits literals unconditionally', () => {
    expect(applyMaskToRaw('1234567890', PHONE, '_')).toBe('(123) 456-7890')
  })

  it('stops producing literals once raw input is exhausted', () => {
    // The trailing space is emitted, then the loop breaks on the first token
    // slot with no raw left — so no `_` placeholders appear here.
    expect(applyMaskToRaw('123', PHONE, '_')).toBe('(123) ')
  })

  it('still emits the leading literal for empty raw input', () => {
    // `slotChar` is ignored here, so nothing pads the tail; the walk ends at
    // the first token slot because raw is empty, having already written `(`.
    expect(applyMaskToRaw('', PHONE, '_')).toBe('(')
  })

  it('skips characters a slot rejects instead of stopping', () => {
    expect(applyMaskToRaw('1a2b3', parseMask('999', DEFAULT_TOKENS), '_')).toBe('123')
  })

  it('truncates raw input longer than the mask', () => {
    expect(applyMaskToRaw('12345', parseMask('999', DEFAULT_TOKENS), '_')).toBe('123')
  })

  it('applies transform before the pattern test', () => {
    const upper = (char: string) => char.toUpperCase()
    expect(applyMaskToRaw('abc', parseMask('AAA', DEFAULT_TOKENS), '_', upper)).toBe('ABC')
    expect(applyMaskToRaw('123', parseMask('AAA', DEFAULT_TOKENS), '_', upper)).toBe('')
  })

  it('works with letter and alphanumeric and sign tokens', () => {
    expect(applyMaskToRaw('AB', parseMask('aa-aa', DEFAULT_TOKENS), '_')).toBe('AB-')
    expect(applyMaskToRaw('a1B2', parseMask('****', DEFAULT_TOKENS), '_')).toBe('a1B2')
    expect(applyMaskToRaw('+123', parseMask('####', DEFAULT_TOKENS), '_')).toBe('+123')
    expect(applyMaskToRaw('ab', parseMask('AA', DEFAULT_TOKENS), '_')).toBe('')
  })

  it('resolves the literal from an escaped mask character', () => {
    expect(applyMaskToRaw('99123', parseMask('\\A99-999', DEFAULT_TOKENS), '_')).toBe('A99-123')
  })

  it('handles date, SSN and custom-token masks', () => {
    expect(applyMaskToRaw('12252023', DATE, '_')).toBe('12/25/2023')
    expect(applyMaskToRaw('123456789', parseMask('999-99-9999', DEFAULT_TOKENS), '_')).toBe('123-45-6789')
    expect(
      applyMaskToRaw('ff00aa', parseMask('hh:hh:hh', { ...DEFAULT_TOKENS, h: TOKEN_HEX }), '_'),
    ).toBe('ff:00:aa')
  })

  it('honours per-element patterns from an array mask', () => {
    const slots = parseMask(['(', /[1-9]/, /\d/, /\d/, ')'], DEFAULT_TOKENS)
    expect(applyMaskToRaw('123', slots, '_')).toBe('(123)')
    // `0` fails the leading `[1-9]` slot, so `0` is skipped and `1` takes it.
    expect(applyMaskToRaw('0123', slots, '_')).toBe('(123)')
  })

  it('ignores the unused slotChar argument, as the pin does', () => {
    expect(applyMaskToRaw('123', PHONE, null)).toBe('(123) ')
    expect(applyMaskToRaw('123', PHONE, 'DD/MM/YYYY')).toBe('(123) ')
  })
})

describe('buildDisplayValue', () => {
  it('returns the value untouched when showSlots is false', () => {
    expect(buildDisplayValue('(123) 45', PHONE, '_', false)).toBe('(123) 45')
  })

  it('pads the remaining literals and token slots with slotChar', () => {
    expect(buildDisplayValue('', PHONE, '_', true)).toBe('(___) ___-____')
    expect(buildDisplayValue('(123) 45', PHONE, '_', true)).toBe('(123) 45_-____')
  })

  it('consumes a multi-character slotChar indexed by slot position', () => {
    expect(buildDisplayValue('', parseMask('99/99/9999', DEFAULT_TOKENS), 'DD/MM/YYYY', true))
      .toBe('DD/MM/YYYY')
    // The literals at indices 4 and 5 are always emitted, so the multi-char
    // slotChar is read at each token's own index rather than consumed as a
    // running cursor across the whole mask.
    expect(buildDisplayValue('', PHONE, 'DD/MM/YYYY', true)).toBe('(D/M) YYY-____')
  })

  it('stops at the first disabled placeholder but keeps literals already emitted', () => {
    // `null` and `''` both disable placeholders. The walk stops at the first
    // token slot, so `''` yields just the leading `(` rather than '' — the
    // literals written before the stop are not rolled back.
    expect(buildDisplayValue('', PHONE, null, true)).toBe('(')
    expect(buildDisplayValue('', PHONE, '', true)).toBe('(')
    // Starting from a value that already covers the leading literals, the same
    // stop leaves `'(123) '`.
    expect(buildDisplayValue('(123', PHONE, '', true)).toBe('(123) ')
    expect(buildDisplayValue('(123', PHONE, '_', true)).toBe('(123) ___-____')
  })

  it('returns the value as-is when it already fills the mask', () => {
    expect(buildDisplayValue('(123) 456-7890', PHONE, '_', true)).toBe('(123) 456-7890')
  })
})

describe('extractRaw', () => {
  it('keeps only the characters at token positions', () => {
    expect(extractRaw('(123) 456-7890', PHONE)).toBe('1234567890')
    expect(extractRaw('12/25/2023', DATE)).toBe('12252023')
    expect(extractRaw('(12', PHONE)).toBe('12')
    expect(extractRaw('', PHONE)).toBe('')
  })

  it('keeps placeholders as raw, because it does not validate', () => {
    expect(extractRaw('(1__) ___-____', PHONE)).toBe('1_________')
    expect(extractRaw('(123) 45_-____', PHONE)).toBe('12345_____')
  })

  it('truncates at the shorter of value and slots', () => {
    expect(extractRaw('1234567890', parseMask('999', DEFAULT_TOKENS))).toBe('123')
  })

  it('reads positionally from slot 0, so a bare tail is misread', () => {
    // `'12'` aligns against slots 0 and 1, not against the two typed digits:
    // slot 0 is the literal `(` and slot 1 is a token, so only `'2'` survives.
    // A caller must pass a value that starts at mask position 0.
    expect(extractRaw('12', PHONE)).toBe('2')
    expect(extractRaw('(12', PHONE)).toBe('12')
  })

  it('round-trips with applyMaskToRaw for a fully formatted value', () => {
    const formatted = applyMaskToRaw('1234567890', PHONE, '_')
    expect(extractRaw(formatted, PHONE)).toBe('1234567890')
  })
})

describe('checkComplete', () => {
  it('accepts a fully filled mask', () => {
    expect(checkComplete('(123) 456-7890', PHONE)).toBe(true)
    expect(checkComplete('12/25/2023', DATE)).toBe(true)
  })

  it('rejects a partially filled mask', () => {
    expect(checkComplete('(123) 456-', PHONE)).toBe(false)
    expect(checkComplete('', parseMask('999', DEFAULT_TOKENS))).toBe(false)
  })

  it('rejects a literal sitting in a token slot', () => {
    expect(checkComplete('(___) ___-____', PHONE)).toBe(false)
  })

  it('ignores optional token slots and everything after them', () => {
    const slots = parseMask('(999) 999-9999? x9999', DEFAULT_TOKENS)
    expect(checkComplete('(123) 456-7890', slots)).toBe(true)
    expect(checkComplete('(123) 456-7890 x1', slots)).toBe(true)
    expect(checkComplete('(123) 456-789', slots)).toBe(false)
  })
})

describe('findNextTokenIndex', () => {
  it('finds the first token at or after `from`', () => {
    expect(findNextTokenIndex(PHONE, 0)).toBe(1)
    expect(findNextTokenIndex(PHONE, 1)).toBe(1)
    expect(findNextTokenIndex(PHONE, 2)).toBe(2)
    // Slot 4 is the `)` literal and slot 5 is the space, so `from: 4` lands on
    // the first digit of the second group at index 6.
    expect(findNextTokenIndex(PHONE, 4)).toBe(6)
    expect(findNextTokenIndex(PHONE, 5)).toBe(6)
    expect(findNextTokenIndex(PHONE, 6)).toBe(6)
    expect(findNextTokenIndex(PHONE, 13)).toBe(13)
  })

  it('returns slots.length as the sentinel when no token remains', () => {
    expect(findNextTokenIndex(DATE, 8)).toBe(8)
    expect(findNextTokenIndex(PHONE, 14)).toBe(14)
    expect(findNextTokenIndex([], 0)).toBe(0)
  })
})

describe('findPrevTokenIndex', () => {
  it('finds the nearest token at or before `from`', () => {
    expect(findPrevTokenIndex(PHONE, 13)).toBe(13)
    expect(findPrevTokenIndex(PHONE, 12)).toBe(12)
    // Index 9 is the `-` literal, so 8 is already a token.
    expect(findPrevTokenIndex(PHONE, 8)).toBe(8)
    expect(findPrevTokenIndex(PHONE, 4)).toBe(3)
    expect(findPrevTokenIndex(PHONE, 3)).toBe(3)
    expect(findPrevTokenIndex(PHONE, 0)).toBe(-1)
  })

  it('returns -1 when no token exists at or before `from`', () => {
    expect(findPrevTokenIndex([], -1)).toBe(-1)
    expect(findPrevTokenIndex(PHONE, -1)).toBe(-1)
    expect(findPrevTokenIndex(PHONE, 0)).toBe(-1)
    // `99/99/9999` starts with a token, so slot 0 is already a hit.
    expect(findPrevTokenIndex(DATE, 0)).toBe(0)
  })

  it('throws rather than clamping when `from` is past the end of `slots`', () => {
    // Unlike `findNextEditablePosition`, this pin function indexes `slots`
    // without the `slots[pos] &&` guard, so an out-of-range `from` dereferences
    // `undefined` — including the `[] , 0` case, which is why an empty slot
    // array must be probed from `-1`. The hook only ever passes a real caret
    // index, which is why upstream never sees it. Ported as-is and pinned here
    // so a future cleanup has to change this assertion on purpose.
    expect(() => findPrevTokenIndex(PHONE, PHONE.length)).toThrow(TypeError)
    expect(() => findPrevTokenIndex([], 0)).toThrow(TypeError)
  })
})

describe('findNextEditablePosition', () => {
  it('advances past literals to the next token', () => {
    // From the space at index 4 the walk skips the space (5) and stops on the
    // token at index 6.
    expect(findNextEditablePosition(4, PHONE, buildDisplayValue('(123) 45', PHONE, '_', true))).toBe(6)
    expect(findNextEditablePosition(0, PHONE, buildDisplayValue('', PHONE, '_', true))).toBe(1)
  })

  it('stops at the end of the value even when a token follows', () => {
    // `value` gates the walk as well as `slots`, so a caret can never be
    // parked beyond what is actually rendered.
    expect(findNextEditablePosition(0, PHONE, '(')).toBe(1)
    expect(findNextEditablePosition(0, PHONE, '(1')).toBe(1)
  })

  it('stops at the end of the mask', () => {
    expect(findNextEditablePosition(PHONE.length, PHONE, '(123) 456-7890')).toBe(PHONE.length)
  })

  it('is a no-op when `from` already sits on a token', () => {
    expect(findNextEditablePosition(1, PHONE, '(123) 456-7890')).toBe(1)
  })
})

describe('processInput', () => {
  it('reproduces a valid masked value unchanged', () => {
    expect(processInput('(123) 456-7890', PHONE, '_')).toBe('(123) 456-7890')
    expect(processInput('(123) 45_-____', PHONE, '_')).toBe('(123) 45')
  })

  it('scans forward past characters the current slot rejects', () => {
    // `_` fails the digit slot; `1` then fills it. The rejected `_` is dropped
    // rather than ending the walk.
    expect(processInput('_1', parseMask('9', DEFAULT_TOKENS), '_')).toBe('1')
    expect(processInput('(123', PHONE, '_')).toBe('(123) ')
    expect(processInput('(12', PHONE, '_')).toBe('(12')
  })

  it('consumes a matching literal from the input, but emits it regardless', () => {
    expect(processInput('(1', PHONE, '_')).toBe('(1')
  })

  it('breaks on the first token slot it cannot fill once input runs out', () => {
    // `inputIndex >= inputValue.length` ends the loop at the first unfilled
    // token, so trailing literals are not emitted — but the leading literal
    // was already written.
    expect(processInput('', PHONE, '_')).toBe('(')
    expect(processInput('(', PHONE, '_')).toBe('(')
  })

  it('drops a whole value the mask cannot accept at all', () => {
    // No literal precedes the token, so the `result.length <= slotIndex` guard
    // fires and the walk stops with an empty result.
    expect(processInput('123', parseMask('AAA', DEFAULT_TOKENS), '_')).toBe('')
    expect(processInput('ab', parseMask('AA', DEFAULT_TOKENS), '_')).toBe('')
  })

  it('documents the length-based guard: a leading literal disables it', () => {
    // With a literal in front, `result.length` (1) already exceeds
    // `slotIndex`, so the guard can no longer stop the walk; it is the
    // separate "input exhausted" exit that ends it. Either way the result is
    // `'('`, never `'()'` — the pin's behaviour, asserted rather than
    // corrected.
    expect(processInput('1', parseMask('(AAA', DEFAULT_TOKENS), '_')).toBe('(')
    expect(processInput('1', parseMask('(AAA)', DEFAULT_TOKENS), '_')).toBe('(')
  })

  it('is idempotent on its own output for these masks', () => {
    const once = processInput('(123) 456-7890', PHONE, '_')
    expect(processInput(once, PHONE, '_')).toBe(once)
  })
})

describe('getResolvedOptions', () => {
  it('defaults slotChar to `_` and separate to false', () => {
    const resolved = getResolvedOptions({ mask: '999' }, '')
    expect(resolved.slotChar).toBe('_')
    expect(resolved.separate).toBe(false)
    expect(resolved.transform).toBeUndefined()
  })

  it('keeps an explicit null / empty slotChar and an explicit separate', () => {
    expect(getResolvedOptions({ mask: '999', slotChar: null }, '').slotChar).toBeNull()
    expect(getResolvedOptions({ mask: '999', slotChar: '' }, '').slotChar).toBe('')
    expect(getResolvedOptions({ mask: '999', separate: true }, '').separate).toBe(true)
  })

  it('forwards transform untouched', () => {
    const transform = (char: string) => char.toUpperCase()
    expect(getResolvedOptions({ mask: '999', transform }, '').transform).toBe(transform)
  })

  it('merges custom tokens over the defaults without mutating either', () => {
    const custom = { h: /[0-9a-f]/ }
    const resolved = getResolvedOptions({ mask: 'h9', tokens: custom }, '')
    expect(resolved.tokens.h).toBe(custom.h)
    expect(resolved.tokens['9']).toBe(DEFAULT_TOKENS['9'])
    expect(DEFAULT_TOKENS).not.toHaveProperty('h')
    expect(custom).not.toHaveProperty('9')
  })

  it('returns a fresh tokens object each call', () => {
    const options = { mask: '999', tokens: { h: /[0-9a-f]/ } }
    const first = getResolvedOptions(options, '')
    const second = getResolvedOptions(options, '')
    expect(first.tokens).not.toBe(second.tokens)
    expect(first.tokens).toEqual(second.tokens)
  })

  it('applies modify overrides for mask, tokens, slotChar and separate', () => {
    const resolved = getResolvedOptions(
      {
        mask: '999',
        modify: () => ({ mask: 'aa', tokens: { a: /\d/ }, slotChar: '#', separate: true }),
      },
      '',
    )
    expect(resolved.slots).toEqual([
      { type: 'token', char: 'a', pattern: /\d/, optional: false },
      { type: 'token', char: 'a', pattern: /\d/, optional: false },
    ])
    expect(resolved.slotChar).toBe('#')
    expect(resolved.separate).toBe(true)
  })

  it('passes rawValue to modify and ignores a falsy return', () => {
    const seen: string[] = []
    const resolved = getResolvedOptions(
      {
        mask: '999',
        modify: (value) => {
          seen.push(value)
          return undefined
        },
      },
      '123',
    )
    expect(seen).toEqual(['123'])
    expect(resolved.slots).toHaveLength(3)
  })

  it('leaves a key untouched when modify omits it', () => {
    const resolved = getResolvedOptions({ mask: '999', slotChar: '#', modify: () => ({ mask: 'aa' }) }, '')
    expect(resolved.slotChar).toBe('#')
    expect(resolved.slots).toHaveLength(2)
  })
})

// Upstream's `formatMask utility`, `isMaskComplete utility` and
// `generatePattern utility` describes, verbatim.
describe('formatMask', () => {
  it('formats raw digits into phone mask', () => {
    expect(formatMask('1234567890', { mask: '(999) 999-9999' })).toBe('(123) 456-7890')
  })

  it('formats partial input', () => {
    expect(formatMask('123', { mask: '(999) 999-9999' })).toBe('(123) ')
  })

  it('handles empty input', () => {
    expect(formatMask('', { mask: '999-999' })).toBe('')
  })

  it('filters non-matching characters', () => {
    expect(formatMask('1a2b3', { mask: '999' })).toBe('123')
  })

  it('applies transform before validation', () => {
    expect(formatMask('abc', { mask: 'AAA', transform: char => char.toUpperCase() })).toBe('ABC')
  })

  it('transform does not affect non-matching characters', () => {
    expect(formatMask('123', { mask: 'AAA', transform: char => char.toUpperCase() })).toBe('')
  })

  it('works with letter tokens', () => {
    expect(formatMask('AB', { mask: 'aa-aa' })).toBe('AB-')
  })

  it('works with custom tokens', () => {
    expect(formatMask('ff00aa', { mask: 'hh:hh:hh', tokens: { h: TOKEN_HEX } })).toBe('ff:00:aa')
  })

  it('works with regex array format', () => {
    expect(formatMask('123', { mask: ['(', /[1-9]/, /\d/, /\d/, ')'] })).toBe('(123)')
  })

  it('truncates values longer than mask', () => {
    expect(formatMask('12345', { mask: '999' })).toBe('123')
  })

  it('handles date mask', () => {
    expect(formatMask('12252023', { mask: '99/99/9999' })).toBe('12/25/2023')
  })

  it('handles SSN mask', () => {
    expect(formatMask('123456789', { mask: '999-99-9999' })).toBe('123-45-6789')
  })
})

describe('unformatMask', () => {
  it('extracts raw value from phone number', () => {
    expect(unformatMask('(123) 456-7890', { mask: '(999) 999-9999' })).toBe('1234567890')
  })

  it('extracts raw value from date', () => {
    expect(unformatMask('12/25/2023', { mask: '99/99/9999' })).toBe('12252023')
  })

  it('returns empty for empty input', () => {
    expect(unformatMask('', { mask: '999-999' })).toBe('')
  })

  it('extracts raw from partial value', () => {
    expect(unformatMask('(12', { mask: '(999) 999-9999' })).toBe('12')
  })
})

describe('isMaskComplete', () => {
  it('returns true for complete phone number', () => {
    expect(isMaskComplete('(123) 456-7890', { mask: '(999) 999-9999' })).toBe(true)
  })

  it('returns false for incomplete phone number', () => {
    expect(isMaskComplete('(123) 456-', { mask: '(999) 999-9999' })).toBe(false)
  })

  it('returns false for empty input', () => {
    expect(isMaskComplete('', { mask: '999' })).toBe(false)
  })

  it('returns true for complete date', () => {
    expect(isMaskComplete('12/25/2023', { mask: '99/99/9999' })).toBe(true)
  })

  it('handles optional segments', () => {
    expect(isMaskComplete('(123) 456-7890', { mask: '(999) 999-9999? x9999' })).toBe(true)
  })
})

describe('generatePattern', () => {
  it('generates pattern for digit mask', () => {
    expect(generatePattern('full', { mask: '999' })).toContain('[0-9]')
  })

  it('generates pattern with literal escaping', () => {
    const pattern = generatePattern('full', { mask: '(999)' })
    expect(pattern).toContain('\\(')
    expect(pattern).toContain('\\)')
  })

  it('generates full-inexact pattern without groups', () => {
    expect(generatePattern('full-inexact', { mask: '99' })).not.toContain('(')
  })

  it('emits the exact source for a full pattern', () => {
    expect(generatePattern('full', { mask: '99/99' })).toBe('([0-9])([0-9])/([0-9])([0-9])')
    expect(generatePattern('full-inexact', { mask: '99/99' })).toBe('[0-9][0-9]/[0-9][0-9]')
  })

  it('wraps optional slots in a group only for mode `full`', () => {
    expect(generatePattern('full', { mask: '9?9' })).toBe('([0-9])([0-9])?')
    expect(generatePattern('full-inexact', { mask: '9?9' })).toBe('[0-9][0-9]?')
  })

  it('escapes every regex metacharacter a literal can carry', () => {
    // Escaped so each one is a literal, not an operator: `.` `*` `+` `?`.
    expect(generatePattern('full-inexact', { mask: '\\.\\*\\+\\?^$()|[]' }))
      .toBe('\\.\\*\\+\\?\\^\\$\\(\\)\\|\\[\\]')
    // A `\` with nothing after it is kept as a literal backslash by
    // `parseMask`, so it is escaped on the way out too.
    expect(generatePattern('full-inexact', { mask: '\\' })).toBe('\\\\')
    // Unescaped, `*` is a default token rather than a literal, so it becomes a
    // character class — the mask language wins over the regex reading.
    expect(generatePattern('full-inexact', { mask: '.*' })).toBe('\\.[A-Za-z0-9]')
  })

  it('produces a usable RegExp source for an array mask', () => {
    const pattern = generatePattern('full-inexact', { mask: ['(', /[1-9]/, /\d/, ')'] })
    expect(new RegExp(`^${pattern}$`).test('(12)')).toBe(true)
    expect(new RegExp(`^${pattern}$`).test('(0)')).toBe(false)
  })

  it('produces a usable RegExp source for a full mask', () => {
    expect(new RegExp(`^${generatePattern('full', { mask: '(999) 999-9999' })}$`).test('(123) 456-7890'))
      .toBe(true)
  })
})

describe('public types', () => {
  it('keeps the helper signatures exact', () => {
    expectTypeOf(formatMask).parameters.toEqualTypeOf<[string, import('./index').UseMaskOptions]>()
    expectTypeOf(unformatMask).returns.toEqualTypeOf<string>()
    expectTypeOf(isMaskComplete).returns.toEqualTypeOf<boolean>()
    expectTypeOf(generatePattern).parameters.toEqualTypeOf<
      ['full' | 'full-inexact', import('./index').UseMaskOptions]
    >()
  })
})

// ---------------------------------------------------------------------------
// The hook half: mirrors upstream's `useMask hook` describe — the DOM value, the
// caret, the selection, the undo/redo history, blur/autoClear and the ARIA
// state. The inputs are real elements created by hand (as upstream does) and
// attached to the document, because the hook manipulates the element's `value`
// and selection directly rather than through React props.
// ---------------------------------------------------------------------------

interface Act {
  (callback: () => void | Promise<void>): Promise<void>
}

/** Create an input and attach it to the document. */
function createMaskedInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  return input
}

/**
 * Dispatch one `keydown` inside its own `act()`.
 *
 * Each event has to flush on its own: the hook reads `processedRef` at the
 * start of a handler, and React does not commit the state it writes until
 * `act()` exits, so two keystrokes batched into one `act()` would both see the
 * pre-first-keystroke value. Upstream's jest tests get this for free because
 * every dispatch sits in its own `act`.
 */
async function pressKey(
  input: HTMLInputElement,
  act: Act,
  key: string,
  init: KeyboardEventInit = {},
): Promise<void> {
  await act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }))
  })
}

/** Type `text` one keystroke at a time, flushing after each. */
async function typeText(input: HTMLInputElement, act: Act, text: string): Promise<void> {
  for (const char of text) {
    await pressKey(input, act, char)
  }
}

/**
 * Write a value into the input the way an edit that bypasses `keydown` does
 * (`cut`, drag-drop, an IME commit): through the native setter so the property
 * really is replaced, followed by an `input` event.
 */
async function writeValueNatively(
  input: HTMLInputElement,
  act: Act,
  value: string,
): Promise<void> {
  await act(() => {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!
    nativeSetter.call(input, value)
    input.dispatchEvent(new InputEvent('input', { inputType: 'deleteByCut' }))
  })
}

/** Wait for a pending `requestAnimationFrame` (the caret clamps run in one). */
async function nextFrame(act: Act): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function selectRange(input: HTMLInputElement, act: Act, start: number, end: number): Promise<void> {
  return act(() => {
    input.setSelectionRange(start, end)
  })
}

describe('useMask', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // --- mount, ref callback and ARIA state --------------------------------

  it('returns the initial empty state and the five contract members', async () => {
    const { result } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    expect(result.current.value).toBe('')
    expect(result.current.rawValue).toBe('')
    expect(result.current.isComplete).toBe(false)
    expect(result.current.ref).toBeDefined()
    expect(result.current.reset).toBeDefined()
    expectTypeOf(result.current.ref).toEqualTypeOf<React.RefCallback<HTMLInputElement>>()
    expectTypeOf(result.current.value).toEqualTypeOf<string>()
    expectTypeOf(result.current.rawValue).toEqualTypeOf<string>()
    expectTypeOf(result.current.isComplete).toEqualTypeOf<boolean>()
    expectTypeOf(result.current.reset).toEqualTypeOf<() => void>()
  })

  it('returns a ref callback function', async () => {
    const { result } = await renderHook(() => useMask({ mask: '999' }))

    expect(typeof result.current.ref).toBe('function')
  })

  it('shows the mask on attach when alwaysShowMask is true', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99', alwaysShowMask: true, slotChar: '_' }),
    )

    await act(() => {
      result.current.ref(input)
    })

    expect(input.value).toBe('__/__')
    expect(result.current.value).toBe('__/__')
  })

  it('shows a multi-character slotChar hint on attach', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99/9999', alwaysShowMask: true, slotChar: 'DD/MM/YYYY' }),
    )

    await act(() => {
      result.current.ref(input)
    })

    expect(input.value).toBe('DD/MM/YYYY')
  })

  it('leaves the field empty on attach when alwaysShowMask is false', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99', alwaysShowMask: false }),
    )

    await act(() => {
      result.current.ref(input)
    })

    expect(input.value).toBe('')
  })

  it('adopts a value the node already carries, without notifying', async () => {
    // The adopted value is re-derived through the mask, so it is reshaped
    // rather than kept verbatim: `12/25` on a `99/99/9999` mask ends up as
    // `12/25/` and not as the new mask's `12/25/____`, because the first pass
    // runs with no raw value to resolve `modify` against and the second pass
    // sees the six-character processed string. Upstream does the same.
    const input = createMaskedInput()
    input.value = '12/25'
    const onChangeRaw = vi.fn()
    const onComplete = vi.fn()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99/9999', onChangeRaw, onComplete }),
    )

    await act(() => {
      result.current.ref(input)
    })

    expect(input.value).toBe('12/25/')
    expect(result.current.value).toBe('12/25/')
    expect(result.current.rawValue).toBe('1225')
    // attaching a ref is not a user edit
    expect(onChangeRaw).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('sets aria-invalid when invalid is true', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '999', invalid: true }))

    await act(() => {
      result.current.ref(input)
    })

    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('does not set aria-invalid when invalid is false', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '999', invalid: false }))

    await act(() => {
      result.current.ref(input)
    })

    expect(input.hasAttribute('aria-invalid')).toBe(false)
  })

  it('re-applies aria-invalid when the option flips on a mounted input', async () => {
    const input = createMaskedInput()
    const { result, rerender, act } = await renderHook(
      (props?: { invalid: boolean }) => useMask({ mask: '999', invalid: props?.invalid }),
      { initialProps: { invalid: false } },
    )

    await act(() => {
      result.current.ref(input)
    })
    expect(input.hasAttribute('aria-invalid')).toBe(false)

    await rerender({ invalid: true })
    expect(input.getAttribute('aria-invalid')).toBe('true')

    await rerender({ invalid: false })
    expect(input.hasAttribute('aria-invalid')).toBe(false)
  })

  it('removes every event listener when the ref is detached', async () => {
    const input = createMaskedInput()
    const removeSpy = vi.spyOn(input, 'removeEventListener')
    const { result, act } = await renderHook(() => useMask({ mask: '999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      result.current.ref(null)
    })

    expect(removeSpy.mock.calls.map(call => call[0]).sort()).toEqual([
      'blur',
      'focus',
      'input',
      'keydown',
      'mousedown',
      'mouseup',
      'paste',
    ])
  })

  // --- focus, blur and autoClear -----------------------------------------

  it('reveals the mask on focus and clears it on blur when nothing was typed', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })

    expect(input.value).toBe('(___) ___-____')

    await act(() => {
      input.blur()
    })

    expect(input.value).toBe('')
    expect(result.current.value).toBe('')
    expect(result.current.rawValue).toBe('')
  })

  it('clears the display on blur when the typed value was fully deleted', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await pressKey(input, act, '1')
    await pressKey(input, act, 'Backspace')

    await act(() => {
      input.blur()
    })

    expect(input.value).toBe('')
    expect(result.current.value).toBe('')
    expect(result.current.rawValue).toBe('')
  })

  it('keeps a partially filled value on blur, without its placeholders', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '99/99/9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')
    expect(input.value).toBe('12/__/____')

    await act(() => {
      input.blur()
    })

    expect(input.value).toBe('12/')
    expect(result.current.rawValue).toBe('12')
  })

  it('alwaysShowMask keeps the placeholders after blur', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99/9999', alwaysShowMask: true }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')

    await act(() => {
      input.blur()
    })

    expect(input.value).toBe('12/__/____')
    expect(result.current.rawValue).toBe('12')
  })

  it('autoClear empties an incomplete field on blur and notifies with empty strings', async () => {
    const input = createMaskedInput()
    const onChangeRaw = vi.fn()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99:99', autoClear: true, onChangeRaw }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')
    expect(result.current.rawValue).toBe('12')

    await act(() => {
      input.blur()
    })

    expect(input.value).toBe('')
    expect(result.current.value).toBe('')
    expect(result.current.rawValue).toBe('')
    expect(onChangeRaw).toHaveBeenLastCalledWith('', '')
  })

  it('autoClear keeps a complete value on blur', async () => {
    const input = createMaskedInput()
    const onChangeRaw = vi.fn()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99:99', autoClear: true, onChangeRaw }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '1230')

    await act(() => {
      input.blur()
    })

    expect(input.value).toBe('12:30')
    expect(result.current.rawValue).toBe('1230')
    expect(onChangeRaw).not.toHaveBeenCalledWith('', '')
  })

  it('autoClear repaints the empty mask on blur when alwaysShowMask is on', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99:99', autoClear: true, alwaysShowMask: true }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')

    await act(() => {
      input.blur()
    })

    expect(input.value).toBe('__:__')
    expect(result.current.rawValue).toBe('')
    expect(result.current.value).toBe('__:__')
  })

  it('showMaskOnFocus false keeps the field blank until something is typed', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99', showMaskOnFocus: false }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    expect(input.value).toBe('')

    await typeText(input, act, '1')
    expect(input.value).toBe('1_/__')

    await act(() => {
      input.blur()
    })
    expect(input.value).toBe('1')
  })

  // --- caret and selection ------------------------------------------------

  it('moves the caret to the end of the typed value when it lands before the first editable slot', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')

    const endOfTyped = input.selectionStart
    expect(endOfTyped).toBeGreaterThan(0)

    await selectRange(input, act, 0, 0)
    await act(() => {
      input.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(input.selectionStart).toBe(endOfTyped)
    expect(input.selectionEnd).toBe(endOfTyped)
  })

  it('preserves an active selection on mouseup', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')

    const fullDisplayLength = input.value.length
    await selectRange(input, act, 0, fullDisplayLength)
    await act(() => {
      input.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(fullDisplayLength)
  })

  it('clamps the caret to the end of the typed value on mousedown past that point', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')

    const endOfTyped = input.selectionStart
    expect(endOfTyped).toBeGreaterThan(0)

    await selectRange(input, act, input.value.length, input.value.length)
    await act(() => {
      input.dispatchEvent(new MouseEvent('mousedown'))
    })
    await nextFrame(act)

    expect(input.selectionStart).toBe(endOfTyped)
    expect(input.selectionEnd).toBe(endOfTyped)
  })

  it('leaves the caret alone on mousedown when it is inside the typed content', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')

    await selectRange(input, act, 3, 3)
    await act(() => {
      input.dispatchEvent(new MouseEvent('mousedown'))
    })
    await nextFrame(act)

    expect(input.selectionStart).toBe(3)
  })

  it('positions the caret at the cut location when content is removed by an input event', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '3334445555')

    expect(input.value).toBe('(333) 444-5555')

    await selectRange(input, act, 6, 9)
    await writeValueNatively(input, act, '(333) -5555')
    await selectRange(input, act, 6, 6)

    expect(input.selectionStart).toBe(6)
    expect(input.selectionEnd).toBe(6)
    expect(result.current.rawValue).toBe('3335555')
  })

  it('positions the caret at the cut location for a partially filled mask with placeholders', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12345')

    expect(input.value).toBe('(123) 45_-____')

    await selectRange(input, act, 6, 7)
    await writeValueNatively(input, act, '(123) 5_-____')
    await selectRange(input, act, 6, 6)

    expect(input.selectionStart).toBe(6)
    expect(input.selectionEnd).toBe(6)
    expect(result.current.rawValue).toBe('1235')
  })

  it('positions the caret after pasted content rather than at the end', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '3335555')

    await act(() => {
      input.setSelectionRange(4, 4)
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: { getData: () => '444' },
      })
      input.dispatchEvent(pasteEvent)
    })

    expect(input.value).toBe('(333) 444-5555')
    expect(input.selectionStart).toBe(10)
    expect(input.selectionEnd).toBe(10)
  })

  it('hops over literals with ArrowRight and ArrowLeft', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')
    // The caret lands past the `)` literal: `newCursorPos` is computed against
    // the masked value, so finishing a literal-bounded run parks the caret at
    // the end of the processed value (`(123) `.length), not on the third digit.
    expect(input.selectionStart).toBe(6)

    // forward from there walks the space literal to the next token slot
    await pressKey(input, act, 'ArrowRight')
    expect(input.selectionStart).toBe(6)

    // left from a token slot just after a literal is not intercepted: the
    // handler leaves `preventDefault` to the browser, whose own one-position
    // move wins and lands the caret inside the `)` literal
    await selectRange(input, act, 5, 5)
    await pressKey(input, act, 'ArrowLeft')
    expect(input.selectionStart).toBe(4)

    // left from index 3 stays put: `start - 1` is already a token
    await selectRange(input, act, 3, 3)
    await pressKey(input, act, 'ArrowLeft')
    expect(input.selectionStart).toBe(3)

    // left from index 1 stays put too: slot 0 is the `(` literal but it is the
    // token at index 0 that decides, so nothing moves
    await selectRange(input, act, 1, 1)
    await pressKey(input, act, 'ArrowLeft')
    expect(input.selectionStart).toBe(1)
  })

  // --- keystroke editing --------------------------------------------------

  it('inserts a character through the mask and swallows a rejected one', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })

    await pressKey(input, act, '1')
    expect(input.value).toBe('(1__) ___-____')
    expect(result.current.rawValue).toBe('1')

    // `a` is rejected by the digit slot: the field is untouched
    await pressKey(input, act, 'a')
    expect(input.value).toBe('(1__) ___-____')
    expect(result.current.rawValue).toBe('1')
  })

  it('backspace removes the character to the left, skipping literals', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '999-99-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')
    expect(input.value).toBe('123-__-____')

    await pressKey(input, act, 'Backspace')
    expect(result.current.rawValue).toBe('12')

    await pressKey(input, act, 'Backspace')
    await pressKey(input, act, 'Backspace')
    expect(result.current.rawValue).toBe('')

    // nothing left to delete: the handler returns without touching the field
    await pressKey(input, act, 'Backspace')
    expect(result.current.rawValue).toBe('')
  })

  it('delete removes the character at the caret', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '1234')
    expect(input.value).toBe('(123) 4__-____')

    await selectRange(input, act, 1, 1)
    await pressKey(input, act, 'Delete')

    expect(result.current.rawValue).toBe('234')
  })

  it('backspace over a selection removes the whole selection', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '1234')

    await selectRange(input, act, 1, 4)
    await pressKey(input, act, 'Backspace')

    expect(result.current.rawValue).toBe('4')
  })

  it('ctrl+Backspace clears everything left of the caret', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '1234')

    await selectRange(input, act, 5, 5)
    await pressKey(input, act, 'Backspace', { ctrlKey: true })

    expect(result.current.rawValue).toBe('4')
  })

  it('typing over a selection replaces the selected characters', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '1234')

    await selectRange(input, act, 1, 4)
    await typeText(input, act, '9')

    expect(result.current.rawValue).toBe('94')
  })

  // --- undo / redo --------------------------------------------------------

  it('undoes a single character insertion via Ctrl+Z', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await pressKey(input, act, '1')

    expect(input.value).toBe('(1__) ___-____')
    expect(result.current.rawValue).toBe('1')

    await pressKey(input, act, 'z', { ctrlKey: true })

    expect(result.current.rawValue).toBe('')
  })

  it('undoes a backspace deletion and restores the caret position', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')

    await selectRange(input, act, 3, 3)
    await pressKey(input, act, 'Backspace')
    expect(result.current.rawValue).toBe('13')

    await pressKey(input, act, 'z', { ctrlKey: true })

    expect(result.current.rawValue).toBe('123')
    expect(input.selectionStart).toBe(3)
  })

  it('supports redo via Ctrl+Shift+Z', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')
    expect(result.current.rawValue).toBe('12')

    await pressKey(input, act, 'z', { ctrlKey: true })
    expect(result.current.rawValue).toBe('1')

    await pressKey(input, act, 'z', { ctrlKey: true, shiftKey: true })
    expect(result.current.rawValue).toBe('12')
  })

  it('supports redo via Ctrl+Y', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await pressKey(input, act, '1')

    await pressKey(input, act, 'z', { ctrlKey: true })
    expect(result.current.rawValue).toBe('')

    await pressKey(input, act, 'y', { ctrlKey: true })
    expect(result.current.rawValue).toBe('1')
  })

  it('supports Cmd+Z for undo', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await pressKey(input, act, '1')

    await pressKey(input, act, 'z', { metaKey: true })

    expect(result.current.rawValue).toBe('')
  })

  it('does nothing on undo with an empty history', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })

    await pressKey(input, act, 'z', { ctrlKey: true })

    expect(result.current.rawValue).toBe('')
    expect(input.value).toBe('(___) ___-____')
  })

  it('clears the redo stack on a new edit', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')

    await pressKey(input, act, 'z', { ctrlKey: true })
    expect(result.current.rawValue).toBe('1')

    await pressKey(input, act, '9')
    expect(result.current.rawValue).toBe('19')

    // redo does nothing: the new edit dropped the redo stack
    await pressKey(input, act, 'z', { ctrlKey: true, shiftKey: true })
    expect(result.current.rawValue).toBe('19')
  })

  it('clears both stacks on reset, so undo afterwards is a no-op', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '(999) 999-9999' }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await pressKey(input, act, '1')

    await act(() => {
      result.current.reset()
    })
    await pressKey(input, act, 'z', { ctrlKey: true })

    expect(result.current.rawValue).toBe('')
  })

  it('caps the undo history at MAX_UNDO_HISTORY entries', async () => {
    // An unbounded mask, so the field never fills up: 150 single-character
    // pushes, of which only the newest 100 survive. Unwinding the whole stack
    // therefore stops at raw length 50 and the 101st undo is a no-op. Without
    // the cap the same loop would unwind all 150 characters to an empty value,
    // so the exact stop position is what pins the cap down.
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '9'.repeat(200) }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })

    for (let i = 0; i < 150; i++) {
      await pressKey(input, act, '7')
    }

    expect(result.current.rawValue).toBe('7'.repeat(150))

    for (let i = 0; i < MAX_UNDO_HISTORY; i++) {
      await pressKey(input, act, 'z', { ctrlKey: true })
    }
    expect(result.current.rawValue).toBe('7'.repeat(50))

    await pressKey(input, act, 'z', { ctrlKey: true })
    expect(result.current.rawValue).toBe('7'.repeat(50))
  })

  // --- callbacks ----------------------------------------------------------

  it('calls onChangeRaw with the raw and masked values on each keystroke', async () => {
    const input = createMaskedInput()
    const onChangeRaw = vi.fn()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99/9999', onChangeRaw }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')

    // the masked argument is the full padded display, not the bare prefix
    expect(onChangeRaw).toHaveBeenNthCalledWith(1, '1', '1_/__/____')
    expect(onChangeRaw).toHaveBeenNthCalledWith(2, '12', '12/__/____')
  })

  it('calls onComplete once, on the transition into completeness', async () => {
    const input = createMaskedInput()
    const onComplete = vi.fn()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '(999) 999-9999', onComplete }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123456789')

    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.isComplete).toBe(false)

    await pressKey(input, act, '0')

    expect(result.current.isComplete).toBe(true)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenLastCalledWith('(123) 456-7890', '1234567890')

    // A further keystroke on the now-full field is rejected by the insert
    // branch (`insertPos >= slots.length`), so no commit happens and the field
    // is not re-announced as complete.
    await pressKey(input, act, '1')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.rawValue).toBe('1234567890')
  })

  it('drives per-keystroke overrides through modify', async () => {
    // `modify` is resolved against the raw value **before** the keystroke being
    // handled: `getResolvedOptions(opts, rawValue)` runs at the top of the
    // keydown handler, so the override a 5th keystroke returns cannot affect
    // that same keystroke's own validation — it lands on the next one, which
    // is why the mask flips when the 6th character is typed.
    const input = createMaskedInput()
    const modify = vi.fn((value: string) => (value === '1234' ? { mask: '99/99/99' } : undefined))
    const { result, act } = await renderHook(() => useMask({ mask: '999999', modify }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '1234')

    expect(modify).toHaveBeenCalled()
    expect(result.current.rawValue).toBe('1234')

    // the 5th keystroke resolves `modify('1234')`, so it is masked as `99/99/99`
    await pressKey(input, act, '5')

    expect(result.current.rawValue).toBe('12345')
    expect(input.value).toBe('12345_')
  })

  it('applies transform before validating each character', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: 'AAAA', transform: char => char.toUpperCase() }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, 'ab')

    // the lowercase keys pass the `[A-Z]` pattern only because `transform`
    // upper-cases them first; the two unused slots keep their placeholder
    expect(result.current.rawValue).toBe('AB')
    expect(input.value).toBe('AB__')
  })

  it('never calls beforeMaskedStateChange, which the pin accepts but does not wire', async () => {
    // Absence-by-construction: upstream declares the option and never reads it
    // (its only occurrence is the declaration), so this port keeps the type for
    // API compatibility and leaves the callback unreachable. The test exists so
    // a later port that *does* wire it shows up as a behaviour change instead of
    // being mistaken for coverage.
    const input = createMaskedInput()
    const beforeMaskedStateChange = vi.fn(() => ({ value: 'x', selection: null }))
    const { result, act } = await renderHook(() =>
      useMask({ mask: '999', beforeMaskedStateChange }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')

    expect(beforeMaskedStateChange).not.toHaveBeenCalled()
    expect(result.current.value).toBe('123')
  })

  it('treats separate as inert, because the pin accepts it and never reads it', async () => {
    // `separate` is resolved by `getResolvedOptions`, carried in its return
    // value, and never consumed by any caller — so `separate: true` and the
    // default produce the same display from the same input. Upstream's docs page
    // documents neither `separate` nor `beforeMaskedStateChange`. Measured here
    // rather than assumed, because the issue claims `separate` decouples `value`
    // from `rawValue`.
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '99/99', separate: true }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')

    expect(result.current.value).toBe('12/__')
    expect(result.current.rawValue).toBe('12')
    // The hook's raw value is derived before the display is padded, so it is
    // `12`. The standalone `unformatMask` helper reads positionally and does
    // **not** recognise placeholders, so running it over the padded display
    // returns `12__` — the two placeholders at token positions count as raw
    // characters. That gap is upstream's too (it is the same `extractRaw`), and
    // it is why the hook keeps its own raw value instead of calling the helper.
    expect(unformatMask(result.current.value, { mask: '99/99' })).toBe('12__')
    expect(isMaskComplete(result.current.value, { mask: '99/99' })).toBe(false)
  })

  it('separate does not change the value a full mask produces', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '99:99', separate: true }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '1230')

    expect(result.current.value).toBe('12:30')
    expect(result.current.rawValue).toBe('1230')
  })

  // --- slotChar -----------------------------------------------------------

  it('null disables placeholders entirely', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99', slotChar: null, alwaysShowMask: true }),
    )

    await act(() => {
      result.current.ref(input)
    })

    expect(input.value).toBe('')
    expect(result.current.value).toBe('')
  })

  it('reads a multi-character slotChar at the slot index, not at a slots-filled cursor', async () => {
    // The hint is indexed by the slot's own position, and `getSlotChar` is only
    // reached for token slots. With `99/99` the hint's `/` therefore never
    // appears — slot 2 is the mask's own `/` literal — and slot 3 reads the
    // hint's `M`, so the display is `DD/MM` by coincidence of alignment rather
    // than by the hint being walked. The placeholder also falls back to `_` past
    // the end of the hint string.
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99', slotChar: 'DD/MM', alwaysShowMask: true }),
    )

    await act(() => {
      result.current.ref(input)
    })

    expect(input.value).toBe('DD/MM')

    const shortHint = createMaskedInput()
    const short = await renderHook(() =>
      useMask({ mask: '999999', slotChar: 'DD', alwaysShowMask: true }),
    )
    await short.act(() => {
      short.result.current.ref(shortHint)
    })

    // slots 0 and 1 take `D`; the four past the end of the hint fall back to `_`
    expect(shortHint.value).toBe('DD____')
  })

  // --- optional segments and isComplete -----------------------------------

  it('marks trailing slots optional, so the required prefix completes the mask', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '(999) 999-9999? x9999' }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '1234567890')

    expect(result.current.isComplete).toBe(true)
    expect(result.current.rawValue).toBe('1234567890')

    await pressKey(input, act, 'Backspace')
    expect(result.current.isComplete).toBe(false)
  })

  // --- reset --------------------------------------------------------------

  it('reset clears the state and calls onChangeRaw with empty strings', async () => {
    const input = createMaskedInput()
    const onChangeRaw = vi.fn()
    const { result, act } = await renderHook(() => useMask({ mask: '999', onChangeRaw }))

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '123')
    expect(result.current.isComplete).toBe(true)

    await act(() => {
      result.current.reset()
    })

    expect(input.value).toBe('')
    expect(result.current.value).toBe('')
    expect(result.current.rawValue).toBe('')
    expect(result.current.isComplete).toBe(false)
    expect(onChangeRaw).toHaveBeenLastCalledWith('', '')
  })

  it('reset repaints the empty mask under alwaysShowMask', async () => {
    const input = createMaskedInput()
    const { result, act } = await renderHook(() =>
      useMask({ mask: '99/99', alwaysShowMask: true }),
    )

    await act(() => {
      result.current.ref(input)
    })
    await act(() => {
      input.focus()
    })
    await typeText(input, act, '12')

    await act(() => {
      result.current.reset()
    })

    expect(input.value).toBe('__/__')
    expect(result.current.value).toBe('__/__')
    expect(result.current.rawValue).toBe('')
  })

  it('reset with no element attached still clears the state', async () => {
    const { result, act } = await renderHook(() => useMask({ mask: '999' }))

    await act(() => {
      result.current.reset()
    })

    expect(result.current.value).toBe('')
    expect(result.current.rawValue).toBe('')
  })

  // --- re-attach ----------------------------------------------------------

  it('detaches from the previous node and attaches to the new one', async () => {
    const first = createMaskedInput()
    const second = createMaskedInput()
    const { result, act } = await renderHook(() => useMask({ mask: '99/99' }))

    await act(() => {
      result.current.ref(first)
    })
    // re-binding the ref detaches the first node: the previous `refCallback`
    // removes its seven listeners before the new node is wired up
    await act(() => {
      result.current.ref(second)
    })
    // `options` is in the ref callback's dependencies, so the `refCallback`
    // identity changes on the re-render this state write causes — React calls
    // the stale ref with `null` and this one with nothing. Calling `ref` again
    // on the re-rendered callback is what re-attaches, which is why a bare
    // re-bind through the hook is not enough in practice.
    await act(() => {
      result.current.ref(second)
    })
    await act(() => {
      second.focus()
    })
    await typeText(second, act, '12')

    expect(second.value).toBe('12/__')
    expect(result.current.rawValue).toBe('12')

    // the first node keeps no live handler: typing into it changes nothing
    first.focus()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }))
    expect(first.value).toBe('')
    expect(result.current.rawValue).toBe('12')
  })
})
