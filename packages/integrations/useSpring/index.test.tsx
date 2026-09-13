import { animated, useSpring as upstreamUseSpring } from '@react-spring/web'
import { describe, expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useSpring } from '../useSpring'

/**
 * `useSpring` is a pure re-export, not a port, so there is no engine to mutate
 * here — the meaningful assertions are that the exported binding IS the
 * upstream function object (identity, not equivalence: a wrapper would be a
 * different object) and that it still behaves as a real React hook inside a
 * component.
 */
describe('useSpring (re-export of @react-spring/web)', () => {
  it('is the upstream binding itself, not a wrapper', () => {
    expect(useSpring).toBe(upstreamUseSpring)
  })

  it('is re-exported unchanged through the @reause/integrations barrel', async () => {
    const integrations = await import('@reause/integrations')

    expect(integrations.useSpring).toBe(upstreamUseSpring)
  })

  it('preserves upstream\'s `[springs, api]` overload', async () => {
    const { result } = await renderHook(() => useSpring(() => ({ opacity: 1 }), []))
    const [styles, api] = result.current

    expect(styles.opacity.get()).toBe(1)
    expect(typeof api.start).toBe('function')
    expect(typeof api.set).toBe('function')
  })

  it('drives an animated element from a component', async () => {
    function Demo() {
      // static config object: no `from`, so the spring sits at the target value
      const styles = useSpring({ opacity: 0.25 })
      return <animated.div data-testid="static" style={styles}>Hello World</animated.div>
    }

    const screen = await render(<Demo />)

    await expect.element(screen.getByTestId('static')).toHaveStyle({ opacity: '0.25' })
  })

  it('animates from `from` to `to` inside a component', async () => {
    let initialOpacity: number | undefined
    let readOpacity: (() => number) | undefined

    function Demo() {
      const styles = useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })
      // render-phase read: the spring value is synchronous, so the first pass
      // observes `from` before any frame has run
      initialOpacity ??= styles.opacity.get()
      readOpacity = () => styles.opacity.get()
      return <animated.div data-testid="animated" style={styles}>Hello World</animated.div>
    }

    await render(<Demo />)

    expect(initialOpacity).toBe(0)
    await expect.poll(() => readOpacity!()).toBeCloseTo(1, 5)
  })
})
