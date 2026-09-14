import type { RefObject } from 'react'
import type { MockInstance } from 'vitest'
import type { StateValue } from '../utils'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  assert,
  clamp,
  createSingletonPromise,
  hasOwn,
  hyphenate,
  increaseWithUnit,
  isClient,
  isDef,
  isIOS,
  isObject,
  isRefLike,
  noop,
  now,
  objectOmit,
  objectPick,
  promiseTimeout,
  rand,
  timestamp,
  toArray,
  toValue,
  writeState,
} from '../utils'

// NOTE: upstream's index.server.test.ts asserts `isClient` is falsy under SSR
// (node). This unit project runs in a real browser, where `isClient` / `isIOS`
// evaluate to their browser values at import time, so only the positive client
// assertions from upstream's index.test.ts are mirrored here.

describe('utils', () => {
  it('increaseWithUnit', () => {
    expect(increaseWithUnit(100, 1)).toEqual(101)
    expect(increaseWithUnit('1px', 1)).toEqual('2px')
    expect(increaseWithUnit('-1em', 1)).toEqual('0em')
    expect(increaseWithUnit('1em', -1)).toEqual('0em')
    expect(increaseWithUnit('1em', -5)).toEqual('-4em')
    expect(increaseWithUnit('0.5vw', 1.5)).toEqual('2vw')
    expect(increaseWithUnit('100 %', 10)).toEqual('110 %')
    expect(increaseWithUnit('var(--cool)', -5)).toEqual('var(--cool)')
  })

  it('objectPick', () => {
    expect(objectPick({ a: 1, b: 2, c: 3 }, ['a', 'b'])).toEqual({ a: 1, b: 2 })
    expect(objectPick({ a: 1, b: 2, c: undefined }, ['a', 'b'], true)).toEqual({ a: 1, b: 2 })
  })

  it('objectOmit', () => {
    const obj = { a: 1, b: 2, c: 3 }

    expect(objectOmit(obj, ['a', 'b'])).toEqual({ c: 3 })
    expect(obj).toEqual({ a: 1, b: 2, c: 3 })
    expect(objectOmit({ a: 1, b: 2, c: undefined }, ['a', 'b'], true)).toEqual({})
    expect(objectOmit({ a: 1, b: 2, c: undefined }, ['b', 'c'], true)).toEqual({ a: 1 })
  })

  it('toArray', () => {
    expect(toArray('abc')).toEqual(['abc'])
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('hyphenate', () => {
    expect(hyphenate('camelCase')).toBe('camel-case')
    expect(hyphenate('toUpperCase')).toBe('to-upper-case')
    expect(hyphenate('already-hyphenated')).toBe('already-hyphenated')
  })
})

describe('promise', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should promiseTimeout work', async () => {
    let num = 0
    setTimeout(() => {
      num = 1
    }, 100)

    const promise = promiseTimeout(100)
    vi.advanceTimersByTime(100)
    await promise
    expect(num).toBe(1)
  })

  it('should promiseTimeout throw timeout', async () => {
    const promise = promiseTimeout(100, true)
    vi.advanceTimersByTime(100)
    await expect(promise).rejects.toBe('Timeout')
  })

  it('should createSingletonPromise work', async () => {
    const createPromise = () => Promise.resolve(0)
    const wrapper = createSingletonPromise(createPromise)
    const promise1 = wrapper()
    const promise2 = wrapper()

    expect(promise1).toBe(promise2)
    const value = await promise1
    expect(value).toBe(0)
  })

  it('should createSingletonPromise reset', async () => {
    const cb = vi.fn()
    const createPromise = () => Promise.resolve(0).then(cb)
    const wrapper = createSingletonPromise(createPromise)
    const promise1 = wrapper()

    await wrapper.reset()
    expect(cb).toHaveBeenCalled()

    const promise2 = wrapper()
    expect(promise1).not.toBe(promise2)
  })
})

describe('is', () => {
  let warnSpy: MockInstance

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should be client', () => {
    expect(isClient).toBeTruthy()
  })

  it('should be IOS', () => {
    expect(isIOS).toBeFalsy()
  })

  it('should assert', () => {
    assert(true)
    expect(warnSpy).not.toBeCalled()
    assert(false, 'error')
    expect(warnSpy).toHaveBeenCalledWith('error')
  })

  it('should be defined', () => {
    expect(isDef(null)).toBeTruthy()
    expect(isDef(0)).toBeTruthy()
    expect(isDef('')).toBeTruthy()
    expect(isDef(undefined)).toBeFalsy()
  })

  it('should be object', () => {
    expect(isObject({})).toBeTruthy()
    expect(isObject(null)).toBeFalsy()
    expect(isObject([])).toBeFalsy()
  })

  it('should be now', () => {
    expect(now()).toBeCloseTo(Date.now(), -2)
    expect(timestamp()).toBeCloseTo(Date.now(), -2)
  })

  it('should clamp', () => {
    expect(clamp(1, 2, 3)).toBe(2)
    expect(clamp(2, 1, 3)).toBe(2)
  })

  it('should noop', () => {
    expect(noop()).toBeUndefined()
  })

  it('should be rand', { retry: 20 }, () => {
    expect(rand(1, 2)).not.toBe(rand(1, 2))
  })

  it('hasOwn', () => {
    class Parent { a = 1 }
    class Child extends Parent {}
    function F() {}
    F.prototype.a = 1
    const obj1 = { a: 1 } as any
    const obj2 = new Child() as any
    // @ts-expect-error ES5 new
    const obj3 = new F() as any
    expect(hasOwn(obj1, 'a')).toBeTruthy()
    expect(hasOwn(obj1, 'b')).toBeFalsy()
    expect(hasOwn(obj2, 'a')).toBeTruthy()
    expect(hasOwn(obj2, 'b')).toBeFalsy()
    expect(hasOwn(obj3, 'a')).toBeFalsy()

    obj3.a = 2
    expect(hasOwn(obj3, 'a')).toBeTruthy()
  })
})

describe('state contract', () => {
  it('resolves the four accepted StateValue shapes with toValue', () => {
    expect(toValue(1)).toBe(1)
    expect(toValue(() => 2)).toBe(2)
    expect(toValue([3, () => {}] as const)).toBe(3)
    expect(toValue({ value: 4, onChange: () => {} })).toBe(4)
  })

  it('does not accept a React ref as a state source', () => {
    // a `RefObject` is a DOM handle, read with `unrefElement` — never a StateValue
    expectTypeOf<RefObject<number>>()
      .not
      .toMatchTypeOf<StateValue<number>>()
    expectTypeOf<StateValue<number>>()
      .not
      .toMatchTypeOf<RefObject<number>>()
  })

  it('still guards ref objects with isRefLike', () => {
    expect(isRefLike({ current: 1 })).toBe(true)
    expect(isRefLike(1)).toBe(false)
    expect(isRefLike(null)).toBe(false)
    expect(isRefLike(() => {})).toBe(false)
  })

  it('writeState writes tuple setters and onChange, and skips read-only sources', () => {
    const setTuple = vi.fn()
    writeState([1, setTuple] as const, 2)
    expect(setTuple).toHaveBeenCalledWith(2)

    const onChange = vi.fn()
    writeState({ value: 1, onChange }, 3)
    expect(onChange).toHaveBeenCalledWith(3)

    // plain values and getters have no write path — no throw, no write
    expect(() => writeState(1, 2)).not.toThrow()
    expect(() => writeState(() => 1, 2)).not.toThrow()

    // a ref is not a state source any more, so it is never written through
    const ref = { current: 1 }
    writeState(ref as unknown as StateValue<number>, 9)
    expect(ref.current).toBe(1)
  })
})
