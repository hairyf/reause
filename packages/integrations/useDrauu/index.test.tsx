import type { UseDrauuReturn } from '../useDrauu'
import { useListener } from '@reause/shared'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useDrauu } from '../useDrauu'

const SVG_NS = 'http://www.w3.org/2000/svg'

// svgs created by the tests, removed after each test
const createdSvgs: SVGSVGElement[] = []

function createSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '200')
  svg.setAttribute('height', '200')
  document.body.appendChild(svg)
  createdSvgs.push(svg)
  return svg
}

function pointerEvent(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    clientX: x,
    clientY: y,
    pressure: 0.5,
  })
}

/**
 * Drive drauu through its real pointer pipeline: `pointerdown` on the target,
 * `pointermove` / `pointerup` on the window (drauu listens there).
 */
function drawStroke(svg: SVGSVGElement): void {
  svg.dispatchEvent(pointerEvent('pointerdown', 10, 10))
  window.dispatchEvent(pointerEvent('pointermove', 30, 30))
  window.dispatchEvent(pointerEvent('pointerup', 30, 30))
}

/** Start a stroke and leave it in progress (drauu keeps `_currentNode`). */
function beginStroke(svg: SVGSVGElement): void {
  svg.dispatchEvent(pointerEvent('pointerdown', 10, 10))
  window.dispatchEvent(pointerEvent('pointermove', 30, 30))
}

afterEach(() => {
  createdSvgs.forEach(svg => svg.remove())
  createdSvgs.length = 0
})

describe('useDrauu', () => {
  it('should be defined', () => {
    expect(useDrauu).toBeDefined()
  })

  it('should create the drauu instance for a real <svg> element and unmount it on unmount', async () => {
    const svg = createSvg()
    const { result, unmount } = await renderHook(() => useDrauu({ current: svg }))

    const instance = result.current.drauuInstance
    expect(instance).toBeDefined()
    expect(instance!.mounted).toBe(true)
    expect(instance!.el).toBe(svg)

    await unmount()
    expect(instance!.mounted).toBe(false)
  })

  it('should mount through a JSX <svg> ref target and unmount on unmount', async () => {
    let captured: UseDrauuReturn | undefined

    function Demo() {
      const target = useRef<SVGSVGElement>(null)
      captured = useDrauu(target)
      return <svg ref={target} width={200} height={200} data-testid="canvas" />
    }

    const screen = await render(<Demo />)
    const instance = captured!.drauuInstance

    expect(instance).toBeDefined()
    expect(instance!.mounted).toBe(true)

    await screen.unmount()
    expect(instance!.mounted).toBe(false)
  })

  it('should stay undefined for a null target and no-op safely', async () => {
    const { result, act } = await renderHook(() => useDrauu({ current: null }))

    expect(result.current.drauuInstance).toBeUndefined()
    expect(typeof result.current.setBrush).toBe('function')
    expect(typeof result.current.onChanged).toBe('function')

    await act(() => {
      result.current.load('<svg />')
      result.current.clear()
      result.current.cancel()
    })

    expect(result.current.dump()).toBeUndefined()
    expect(result.current.undo()).toBeUndefined()
    expect(result.current.redo()).toBeUndefined()
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('should ignore a non-svg element target (upstream SVGSVGElement guard)', async () => {
    const div = document.createElement('div')
    const { result } = await renderHook(() => useDrauu({ current: div }))

    expect(result.current.drauuInstance).toBeUndefined()
  })

  it('should merge the default brush with user options and hand it to the instance', async () => {
    const svg = createSvg()
    const { result } = await renderHook(() => useDrauu({ current: svg }, { brush: { color: 'red', size: 5 } }))

    expect(result.current.brush).toEqual({
      color: 'red',
      size: 5,
      arrowEnd: false,
      cornerRadius: 0,
      dasharray: undefined,
      fill: 'transparent',
      mode: 'draw',
    })

    const instance = result.current.drauuInstance!
    expect(instance.brush.color).toBe('red')
    expect(instance.brush.size).toBe(5)
    expect(instance.brush.mode).toBe('draw')
    expect(instance.mode).toBe('draw')
  })

  it('should forward non-brush options to the drauu instance', async () => {
    const svg = createSvg()
    const { result } = await renderHook(() => useDrauu({ current: svg }, {
      coordinateTransform: false,
      coordinateScale: 2,
    }))

    const instance = result.current.drauuInstance!
    expect(instance.options.coordinateTransform).toBe(false)
    expect(instance.options.coordinateScale).toBe(2)
  })

  it('should apply the brush mode option to the drauu model', async () => {
    const svg = createSvg()
    const { result } = await renderHook(() => useDrauu({ current: svg }, { brush: { color: 'black', size: 3, mode: 'line' } }))

    expect(result.current.drauuInstance!.mode).toBe('line')
  })

  it('should load an svg string and dump it back', async () => {
    const svg = createSvg()
    const { result, act } = await renderHook(() => useDrauu({ current: svg }))

    await act(() => {
      result.current.load('<path d="M 0 0 L 10 10" stroke="red" fill="none" />')
    })

    expect(result.current.dump()).toContain('stroke="red"')
  })

  it('should round-trip dump -> clear -> load', async () => {
    const svg = createSvg()
    const { result, act } = await renderHook(() => useDrauu({ current: svg }))

    await act(() => drawStroke(svg))
    const dumped = result.current.dump()!
    expect(dumped).toContain('<path')

    await act(() => result.current.clear())
    expect(result.current.dump()).toBe('')

    await act(() => result.current.load(dumped))
    expect(result.current.dump()).toBe(dumped)
  })

  it('should clear the canvas and the operation stack', async () => {
    const svg = createSvg()
    const { result, act } = await renderHook(() => useDrauu({ current: svg }))

    await act(() => drawStroke(svg))
    expect(result.current.dump()).not.toBe('')
    expect(result.current.canUndo).toBe(true)

    await act(() => result.current.clear())
    expect(result.current.dump()).toBe('')
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('should undo and redo, keeping canUndo / canRedo in sync', async () => {
    const svg = createSvg()
    const { result, act } = await renderHook(() => useDrauu({ current: svg }))

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)

    await act(() => drawStroke(svg))
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
    expect(svg.querySelectorAll('path')).toHaveLength(1)

    let undone: boolean | undefined
    await act(() => {
      undone = result.current.undo()
    })
    expect(undone).toBe(true)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
    expect(svg.querySelectorAll('path')).toHaveLength(0)

    let redone: boolean | undefined
    await act(() => {
      redone = result.current.redo()
    })
    expect(redone).toBe(true)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
    expect(svg.querySelectorAll('path')).toHaveLength(1)
  })

  it('should cancel the stroke in progress', async () => {
    const svg = createSvg()
    const { result, act } = await renderHook(() => useDrauu({ current: svg }))

    await act(() => beginStroke(svg))
    expect(svg.querySelectorAll('path')).toHaveLength(1)

    await act(() => result.current.cancel())
    expect(svg.querySelectorAll('path')).toHaveLength(0)
  })

  it('should update both the returned brush and the instance through setBrush', async () => {
    const svg = createSvg()
    const { result, act } = await renderHook(() => useDrauu({ current: svg }))
    const instance = result.current.drauuInstance!

    await act(() => {
      result.current.setBrush({ color: 'blue', size: 8, mode: 'rectangle' })
    })

    expect(result.current.brush).toEqual({ color: 'blue', size: 8, mode: 'rectangle' })
    expect(instance.brush).toBe(result.current.brush)
    expect(instance.brush.color).toBe('blue')
    expect(instance.brush.size).toBe(8)
    expect(instance.mode).toBe('rectangle')

    // the brush is the one drauu paints with
    await act(() => result.current.setBrush({ color: 'green', size: 4, mode: 'draw' }))
    await act(() => drawStroke(svg))
    expect(result.current.dump()).toContain('stroke="green"')
  })

  it('should accept the React functional updater in setBrush', async () => {
    const svg = createSvg()
    const { result, act } = await renderHook(() => useDrauu({ current: svg }))
    const instance = result.current.drauuInstance!

    await act(() => {
      result.current.setBrush(prev => ({ ...prev, color: 'purple', size: prev.size + 1 }))
    })

    // the updater receives the current brush and only the patched fields change
    expect(result.current.brush.color).toBe('purple')
    expect(result.current.brush.size).toBe(4)
    expect(result.current.brush.mode).toBe('draw')
    expect(instance.brush).toBe(result.current.brush)

    // a second updater composes on the first (latest value, not the mount value)
    await act(() => {
      result.current.setBrush(prev => ({ ...prev, size: prev.size + 1 }))
    })
    expect(result.current.brush.size).toBe(5)
    expect(instance.brush.size).toBe(5)
  })

  it('should update the returned brush with no mounted instance', async () => {
    const { result, act } = await renderHook(() => useDrauu({ current: null }))

    expect(result.current.drauuInstance).toBeUndefined()

    await act(() => {
      result.current.setBrush(prev => ({ ...prev, color: 'teal' }))
    })

    expect(result.current.brush.color).toBe('teal')
    expect(result.current.drauuInstance).toBeUndefined()
  })

  it('should return one object with the paired setBrush and every upstream member', async () => {
    const svg = createSvg()
    const { result } = await renderHook(() => useDrauu({ current: svg }))

    // return-shape rule 5: a single object, every caller-writable value paired
    // with its setter (`brush` / `setBrush`) plus the upstream methods and the
    // read-only outputs (`drauuInstance`, `canUndo`, `canRedo`).
    expect(Array.isArray(result.current)).toBe(false)
    expect(Object.keys(result.current).sort()).toEqual([
      'brush',
      'canRedo',
      'canUndo',
      'cancel',
      'clear',
      'drauuInstance',
      'dump',
      'load',
      'onCanceled',
      'onChanged',
      'onCommitted',
      'onEnd',
      'onStart',
      'redo',
      'setBrush',
      'undo',
    ])
    expect(typeof result.current.setBrush).toBe('function')
  })

  it('should fire each on* registrar and stop it with the returned off function', async () => {
    const svg = createSvg()
    const { result, act } = await renderHook(() => useDrauu({ current: svg }))

    const onChanged = vi.fn()
    const onCommitted = vi.fn()
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const onCanceled = vi.fn()

    result.current.onChanged(onChanged)
    result.current.onCommitted(onCommitted)
    result.current.onStart(onStart)
    result.current.onEnd(onEnd)
    result.current.onCanceled(onCanceled)

    await act(() => drawStroke(svg))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onCommitted).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
    // start + move + end all emit `changed`
    expect(onChanged.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(onCanceled).not.toHaveBeenCalled()

    // undo emits `changed` too (checked before `cancel`, which leaves drauu's
    // internal `drawing` flag set until the next pointerup)
    const changesBeforeUndo = onChanged.mock.calls.length
    await act(() => {
      result.current.undo()
    })
    expect(onChanged.mock.calls.length).toBeGreaterThan(changesBeforeUndo)

    // `canceled` is only emitted while a stroke is in progress
    await act(() => beginStroke(svg))
    await act(() => result.current.cancel())
    expect(onCanceled).toHaveBeenCalledTimes(1)

    // the returned off() removes exactly that listener and is idempotent
    const first = vi.fn()
    const second = vi.fn()
    const handle = result.current.onChanged(first)
    result.current.onChanged(second)

    await act(() => drawStroke(svg))
    const firstCalls = first.mock.calls.length
    const secondCalls = second.mock.calls.length
    expect(firstCalls).toBeGreaterThan(0)
    expect(secondCalls).toBe(firstCalls)

    if (handle) {
      handle()
      handle()
    }

    await act(() => drawStroke(svg))
    expect(first.mock.calls.length).toBe(firstCalls)
    expect(second.mock.calls.length).toBeGreaterThan(secondCalls)
  })

  it('should be consumable with useListener — registers on mount and unsubscribes on unmount', async () => {
    const svg = createSvg()
    const onChange = vi.fn()

    let captured: UseDrauuReturn | undefined
    const { act } = await renderHook(() => {
      captured = useDrauu({ current: svg })
      return captured
    })

    function Listener({ on }: { on: UseDrauuReturn['onChanged'] }) {
      useListener(on, onChange)
      return <div data-testid="listener" />
    }

    const screen = await render(<Listener on={captured!.onChanged} />)

    await act(() => drawStroke(svg))
    const calls = onChange.mock.calls.length
    // one stroke emits `changed` for down / move / up
    expect(calls).toBeGreaterThan(0)

    // useListener calls the returned `off` on unmount — the listener stops
    // firing while the hook instance itself stays mounted
    await screen.unmount()
    await act(() => drawStroke(svg))
    expect(onChange.mock.calls.length).toBe(calls)
  })

  it('should destroy and recreate the instance when the resolved element changes', async () => {
    const first = createSvg()
    const target: { current: SVGSVGElement | null } = { current: first }
    const { result, rerender } = await renderHook(() => useDrauu(target))

    const instance = result.current.drauuInstance!
    expect(instance.el).toBe(first)

    const second = createSvg()
    target.current = second
    await rerender()

    expect(result.current.drauuInstance).not.toBe(instance)
    expect(instance.mounted).toBe(false)
    expect(result.current.drauuInstance!.el).toBe(second)
    expect(result.current.drauuInstance!.mounted).toBe(true)

    // clearing the target destroys the instance again
    target.current = null
    await rerender()
    expect(result.current.drauuInstance).toBeUndefined()
  })
})
