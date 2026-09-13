import type { MaskSlot } from './index'
import { describe, expect, expectTypeOf, it } from 'vitest'
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

  parseMask,
  processInput,
  unformatMask,
} from './index'

// Mirrors the pure half of upstream `source/mantine/packages/@mantine/hooks/src/use-mask/use-mask.test.ts`
// (the four `utility` describes plus the `mask parsing` describe). The hook
// half of that file — every DOM, caret and undo case — belongs to the hook
// body and is deliberately not exercised here: this file must stay DOM-free so
// an engine regression localises without browser noise.

const PHONE: MaskSlot[] = parseMask('(999) 999-9999', DEFAULT_TOKENS)
const DATE: MaskSlot[] = parseMask('99/99/9999', DEFAULT_TOKENS)

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
