import type { UseCssSupportsReturn } from '../useCssSupports'
import { useState } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useCssSupports } from '../useCssSupports'

// Mirrors upstream `source/vueuse/packages/core/useCssSupports/index.browser.test.ts`.
// Vue `shallowRef` + template bindings become React state; the plain inputs are
// additionally exercised with `renderHook` re-renders.

function BasicComponent() {
  const { isSupported: textDecoration } = useCssSupports(
    'text-decoration-style',
    'blink',
  )
  const { isSupported: transformOrigin } = useCssSupports(
    'transform-origin',
    '5%',
  )
  const { isSupported: flex } = useCssSupports('display: flex')
  const { isSupported: variable } = useCssSupports('(--foo: red)')
  const { isSupported: selectorHas } = useCssSupports('selector(:has(a))')
  const { isSupported: query } = useCssSupports(
    '(transform-style: preserve) or (-moz-transform-style: preserve) or (-webkit-transform-style: preserve)',
  )
  const { isSupported: doesNotExists } = useCssSupports('doesNotExist')

  return (
    <pre data-testid="data">
      {JSON.stringify({
        textDecoration,
        transformOrigin,
        flex,
        variable,
        selectorHas,
        query,
        doesNotExists,
      })}
    </pre>
  )
}

function ReactiveComponent() {
  const [condition, setCondition] = useState('display: flex')
  const { isSupported: conditionSupported } = useCssSupports(condition)

  const [prop, setProp] = useState('transform-origin')
  const [value, setValue] = useState('5%')
  const { isSupported: propValueSupported } = useCssSupports(prop, value)

  return (
    <>
      <pre data-testid="conditionResult">{String(conditionSupported)}</pre>
      <pre data-testid="propValueResult">{String(propValueSupported)}</pre>
      <button data-testid="setInvalidCondition" onClick={() => setCondition('e18e')}>invalid condition</button>
      <button data-testid="setInvalidValue" onClick={() => setValue('e18e')}>invalid value</button>
      <button data-testid="setValidValue" onClick={() => setValue('5%')}>valid value</button>
      <button data-testid="setInvalidProp" onClick={() => setProp('e18e')}>invalid prop</button>
    </>
  )
}

function ConditionTextComponent() {
  const { isSupported: noOptionsResult } = useCssSupports('display: flex')
  const { isSupported: withOptionsResult } = useCssSupports('display: flex', {})

  return (
    <>
      <pre data-testid="noOptions">{String(noOptionsResult)}</pre>
      <pre data-testid="withOptions">{String(withOptionsResult)}</pre>
    </>
  )
}

function PropValueOverloadComponent() {
  const { isSupported: conditionOnlyResult } = useCssSupports('display: flex')
  const { isSupported: withUndefinedResult } = useCssSupports('display: flex', undefined)

  return (
    <>
      <pre data-testid="conditionOnly">{String(conditionOnlyResult)}</pre>
      <pre data-testid="withUndefined">{String(withUndefinedResult)}</pre>
    </>
  )
}

describe('useCssSupports', () => {
  it('should be defined', () => {
    expect(useCssSupports).toBeDefined()
  })

  it('should correctly support existing features', async () => {
    const screen = await render(<BasicComponent />)
    const pre = screen.getByTestId('data')
    await expect.element(pre).toBeVisible()

    const results = JSON.parse(pre.query()!.textContent!)

    expect(results.textDecoration).toBe(false)
    expect(results.transformOrigin).toBe(true)
    expect(results.flex).toBe(true)
    expect(results.variable).toBe(true)
    expect(results.selectorHas).toBe(true)
    expect(results.query).toBe(false)
    expect(results.doesNotExists).toBe(false)
  })

  it('should reactively update if condition, prop or value changes', async () => {
    const screen = await render(<ReactiveComponent />)
    const conditionResult = screen.getByTestId('conditionResult')
    const propValueResult = screen.getByTestId('propValueResult')
    await expect.element(conditionResult).toBeVisible()
    await expect.element(propValueResult).toBeVisible()

    // `expect.element` retries, unlike a bare `query()` read — the re-render
    // after a click can land later than the assertion under load
    await expect.element(conditionResult).toHaveTextContent('true')
    await expect.element(propValueResult).toHaveTextContent('true')

    await screen.getByTestId('setInvalidCondition').click()
    await expect.element(conditionResult).toHaveTextContent('false')

    await screen.getByTestId('setInvalidValue').click()
    await expect.element(propValueResult).toHaveTextContent('false')

    await screen.getByTestId('setValidValue').click()
    await expect.element(propValueResult).toHaveTextContent('true')

    await screen.getByTestId('setInvalidProp').click()
    await expect.element(propValueResult).toHaveTextContent('false')
  })

  it('should not treat conditionText as prop when options is set and value is undefined', async () => {
    const screen = await render(<ConditionTextComponent />)
    const noOptions = screen.getByTestId('noOptions')
    const withOptions = screen.getByTestId('withOptions')
    await expect.element(noOptions).toBeVisible()
    await expect.element(withOptions).toBeVisible()

    expect(noOptions.query()!.textContent!.trim()).toBe('true')
    expect(withOptions.query()!.textContent!.trim()).toBe('true')
  })

  it('should use prop + value instead of condition if value is explicitly undefined', async () => {
    const screen = await render(<PropValueOverloadComponent />)
    const conditionOnly = screen.getByTestId('conditionOnly')
    const withUndefined = screen.getByTestId('withUndefined')
    await expect.element(conditionOnly).toBeVisible()
    await expect.element(withUndefined).toBeVisible()

    expect(conditionOnly.query()!.textContent!.trim()).toBe('true')
    expect(withUndefined.query()!.textContent!.trim()).toBe('false')
  })

  it('should re-evaluate when the condition changes', async () => {
    const { result, rerender } = await renderHook(
      ({ condition }: { condition: string } = { condition: 'display: flex' }) => useCssSupports(condition),
      { initialProps: { condition: 'display: flex' } },
    )
    expect(result.current.isSupported).toBe(true)

    await rerender({ condition: 'e18e' })
    expect(result.current.isSupported).toBe(false)
  })

  it('should re-evaluate when the prop / value change', async () => {
    const { result, rerender } = await renderHook(
      ({ prop, value }: { prop: string, value: string } = { prop: 'transform-origin', value: '5%' }) =>
        useCssSupports(prop, value),
      { initialProps: { prop: 'transform-origin', value: '5%' } },
    )
    expect(result.current.isSupported).toBe(true)

    await rerender({ prop: 'transform-origin', value: 'e18e' })
    expect(result.current.isSupported).toBe(false)

    await rerender({ prop: 'display', value: 'flex' })
    expect(result.current.isSupported).toBe(true)
  })

  it('should evaluate CSS.supports on a custom window', async () => {
    const supports = vi.fn(() => true)
    const fakeWindow = { CSS: { supports } } as unknown as Window
    const { result } = await renderHook(() =>
      useCssSupports('display', 'flex', { window: fakeWindow }),
    )
    expect(result.current.isSupported).toBe(true)
    expect(supports).toHaveBeenCalledWith('display', 'flex')
  })

  // reause-specific, NON-UPSTREAM semantics: upstream only defaults an
  // `undefined` window to `defaultWindow`, so `{ window: null }` reaches
  // `window?.CSS.supports(...)` and yields `undefined` (not `ssrValue`).
  // reause treats any falsy custom window as "no window" and stays at
  // `ssrValue`; the divergence is documented in index.tsx and index.md.
  it('should stay at ssrValue when no window is available', async () => {
    const { result } = await renderHook(() =>
      useCssSupports('display: flex', { window: null as unknown as undefined, ssrValue: true }),
    )
    expect(result.current.isSupported).toBe(true)
  })

  it('types: returns an { isSupported } object mirroring the upstream Supportable', async () => {
    const { result } = await renderHook(() => useCssSupports('display: flex'))
    expectTypeOf(result.current).toEqualTypeOf<UseCssSupportsReturn>()
    expectTypeOf(result.current.isSupported).toEqualTypeOf<boolean>()
  })
})
