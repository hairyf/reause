import type { SplitterPaneSize, SplitterRedistribute, SplitterStep, UseSplitterPanel } from './engine'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyConstraints,
  detectPixelMode,
  encodeSize,
  encodeWorkingSizes,
  getCollapsed,
  getMax,
  getMin,
  getRootFontSize,
  resetAdjacentSizes,
  resolvePanel,
  resolveSize,
  resolveStep,
  resolveWorkingSizes,
  sizeMagnitude,
} from './engine'

/**
 * The engine's pure helpers live in the sibling `./engine` module and are deliberately NOT
 * re-exported here. Only a type re-export crosses the module boundary (types are not collected by
 * `scripts/update.ts`'s `parseExports`), so this file mints no extra `meta/functions.md` rows:
 * every value the resolver sees from it is the hook itself.
 */
export type {
  SplitterPaneSize,
  SplitterStep,
  UseSplitterPanel,
  UseSplitterRedistributeFn,
  UseSplitterRedistributeInput,
  UseSplitterResolvedPanel,
} from './engine'

export interface UseSplitterOptions {
  /** Panel configuration array (minimum 2 panels) */
  panels: UseSplitterPanel[]
  /** Layout direction, `'horizontal'` by default */
  orientation?: 'horizontal' | 'vertical'
  /** Controlled sizes, each value keeps the unit it was declared in */
  sizes?: SplitterPaneSize[]
  /** Called during resize with updated sizes, each value keeps its declared unit */
  onSizeChange?: (sizes: SplitterPaneSize[]) => void
  /** Called when drag starts */
  onResizeStart?: (handleIndex: number) => void
  /** Called when drag ends */
  onResizeEnd?: (handleIndex: number, sizes: SplitterPaneSize[]) => void
  /** Called when a panel collapses or expands */
  onCollapseChange?: (panelIndex: number, collapsed: boolean) => void
  /**
   * How to borrow space from non-adjacent panels when the immediate neighbor is at its min/max.
   * `'nearest'` takes from the nearest panel in the drag direction first. `'equal'` distributes
   * equally among all panels in the drag direction. A function receives sizes, panels, handleIndex
   * and delta, and returns new sizes. When not set, only the two adjacent panels are affected.
   */
  redistribute?: SplitterRedistribute
  /** Keyboard step size, a `number`/`%` is a percentage, `px`/`rem` is resolved to pixels, `1` by default */
  step?: SplitterStep
  /** Shift+arrow step size, a `number`/`%` is a percentage, `px`/`rem` is resolved to pixels, `10` by default */
  shiftStep?: SplitterStep
  /** Text direction for keyboard nav, `'ltr'` by default */
  dir?: 'ltr' | 'rtl'
  /** Restore the two panels adjacent to a handle to their default ratio (preserving their combined size) when the handle is double-clicked, `true` by default */
  resetOnDoubleClick?: boolean
  /** Enable/disable the hook, `true` by default */
  enabled?: boolean
}

export interface UseSplitterReturnValue<T extends HTMLElement = any> {
  /** Ref callback for the container element */
  ref: React.RefCallback<T | null>
  /** Current panel sizes, each value keeps the unit it was declared in */
  sizes: SplitterPaneSize[]
  /**
   * Whether sizes are tracked in pixels because any pane size, `min`, `max`, `step`, `shiftStep` or
   * `collapseThreshold` uses a fixed `px`/`rem` unit
   */
  pixelMode: boolean
  /** Which panels are currently collapsed */
  collapsed: boolean[]
  /** Index of handle being dragged, or -1 */
  activeHandle: number
  /** Get props to spread on each resize handle */
  getHandleProps: (input: { index: number }) => {
    'ref': React.RefCallback<HTMLElement>
    'role': 'separator'
    'aria-orientation': 'horizontal' | 'vertical'
    'aria-valuenow': number
    'aria-valuemin': number
    'aria-valuemax': number
    'tabIndex': number
    'onKeyDown': React.KeyboardEventHandler
    'onDoubleClick': React.MouseEventHandler
    'data-active': boolean | undefined
    'data-orientation': 'horizontal' | 'vertical'
  }
  /** Programmatically set sizes, each value keeps its declared unit */
  setSizes: (sizes: SplitterPaneSize[]) => void
  /** Collapse a panel */
  collapse: (panelIndex: number) => void
  /** Expand a collapsed panel */
  expand: (panelIndex: number) => void
  /** Toggle collapse of a panel */
  toggleCollapse: (panelIndex: number) => void
  /**
   * Reset the two panels adjacent to a handle to their default ratio, preserving their combined
   * size
   */
  reset: (handleIndex: number) => void
}

/**
 * Controlled/uncontrolled value resolution, reproduced from `@mantine/hooks`' `useUncontrolled`
 * (`source/mantine/packages/@mantine/hooks/src/use-uncontrolled/`) because `useSplitter`'s sizing
 * state is neither of the two shapes reause already ships:
 *
 * - `@reause/shared`'s `useControllableState` would be wrong here. It treats a
 *   defined* source as controlled, and `useSplitter` deliberately distinguishes
 *   "controlled with an empty override" from "uncontrolled": `sizes: undefined`
 *   must fall back to `panels.map(panel => panel.defaultSize)`, and a controlled
 *   layout with no `onSizeChange` must leave its own state untouched rather than
 *   silently re-render the same value forever.
 * - Upstream's three-way fallback (`value` → `defaultValue` → `finalValue`) and
 *   its third return value (`isControlled`) are exactly what the two write
 *   paths below branch on, so the read/write halves stay in one place.
 *
 * The hook body is identical in behaviour to upstream's: `useState` is always called (so the hook
 * order never depends on which mode is active), a controlled `value` wins on every render, and only
 * the uncontrolled path commits `setUncontrolledValue` before invoking `onChange`.
 */
function useSplitterState<T>(
  options: { value?: T, defaultValue?: T, finalValue?: T, onChange?: (value: T) => void },
): [T, (value: T) => void, boolean] {
  const { value, defaultValue, finalValue, onChange } = options
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(
    defaultValue !== undefined ? defaultValue : (finalValue as T),
  )

  if (value !== undefined) {
    return [value, (next: T) => onChange?.(next), true]
  }

  return [
    uncontrolledValue,
    (next: T) => {
      setUncontrolledValue(next)
      onChange?.(next)
    },
    false,
  ]
}

/**
 * Snapshot of an in-flight drag. A single mutable object in a ref (rather than React state) because
 * the pointer handlers are attached by a stable ref callback that never re-runs on a state change,
 * so they must read the live gesture from something they can see.
 * `startRaw`/`startSizes`/`preCollapseSizes` are captured at `pointerdown` so every `pointermove`
 * computes from the gesture's origin instead of accumulating rounding drift; `startRaw` is the raw
 * (declared-unit) sizes and `startSizes` their working-pixel form.
 */
interface SplitterInternalState {
  isDragging: boolean
  handleIndex: number
  startPointer: number
  containerSize: number
  rootFontSize: number
  pixelMode: boolean
  startSizes: number[]
  startRaw: SplitterPaneSize[]
  preCollapseSizes: SplitterPaneSize[]
}

function createInitialInternalState(): SplitterInternalState {
  return {
    isDragging: false,
    handleIndex: -1,
    startPointer: 0,
    containerSize: 0,
    rootFontSize: 16,
    pixelMode: false,
    startSizes: [],
    startRaw: [],
    preCollapseSizes: [],
  }
}

/**
 * React port of `@mantine/hooks`' `useSplitter` — a resizable panel layout with draggable,
 * keyboard-accessible separators.
 *
 * Map from @mantine/hooks `useSplitter`
 * (`source/mantine/packages/@mantine/hooks/src/use-splitter/`)
 *
 * Direct mirror, not a React-ified variant: upstream's option bag, its eleven return members and
 * its named export are kept exactly, and `useSplitter` is exported as a function declaration with
 * no companion default export (mantine named-exports its hooks). The pure sizing math lives in the
 * sibling `./engine` module; this file owns the React and DOM half — the container/handle refs,
 * pointer drag, keyboard navigation, the ARIA prop bag and the reactive state.
 *
 * ### The unit model is global, not per-panel
 *
 * A bare `number` or a `%` string is a *flexible* size that shares the leftover space by weight;
 * `px`/`rem` is a *fixed* size. `pixelMode` (returned, so a consumer can render accordingly) flips
 * to `true` when **any** pane size, `min`, `max`, `collapseThreshold`, `step`, `shiftStep` or
 * controlled size uses a fixed unit — one fixed unit anywhere re-interprets every size in the
 * layout, and a bare number then means *percent of the container* rather than a relative weight.
 * All drag and keyboard math therefore runs on `resolveWorkingSizes` pixels and is encoded back
 * through `encodeWorkingSizes`, which preserves each pane's declared unit.
 *
 * ### Pointer drag
 *
 * `pointerdown` on a handle (left button only, and only while `enabled`) starts a drag: the body's
 * `userSelect`/`cursor` are suppressed, `activeHandle` is published, listeners are attached to
 * `document`, and the starting working sizes are snapshotted. `pointermove` is coalesced through
 * `requestAnimationFrame`; `pointerup`/`pointercancel` flush once more, restore the body styles,
 * and report through `onResizeEnd`. Listeners are torn down per handle element with an
 * `AbortController` that the stable ref callback owns, so re-attaching a handle releases the
 * previous element's listeners.
 *
 * ### Keyboard and accessibility
 *
 * `getHandleProps` returns a `role="separator"` bag with `aria-orientation`, `aria-valuenow` (the
 * before-panel's working size, rounded), `aria-valuemin` / `aria-valuemax`, `tabIndex: 0`,
 * `data-active` / `data-orientation` and the `onKeyDown` / `onDoubleClick` handlers. Arrow keys
 * step the adjacent pair by `step` (`shiftStep` with Shift) and respect `dir: 'rtl'`; `Home` /
 * `End` drive the before-panel to its minimum / maximum; `Enter` collapses the before-panel when it
 * is the smaller of the two and collapsible, else the after-panel, else the before-panel. Arrow
 * keys on the wrong axis return without `preventDefault`, so page scrolling still works.
 *
 * ### Collapse, expand and reset
 *
 * `collapse` / `expand` / `toggleCollapse` move a panel's whole working size to its neighbour
 * (panel 0's neighbour is panel 1; any other panel's neighbour is the one before it) and restore it
 * from the pre-collapse snapshot — the *raw* size, so a fixed `240px` pane comes back as `240px`
 * rather than as a percentage of the container. `reset(handleIndex)` restores the two adjacent
 * panels to their declared default ratio while preserving their combined size.
 *
 * @example
 * const { ref, sizes, getHandleProps, reset } = useSplitter({
 *   panels: [{ defaultSize: 30, min: 10, collapsible: true }, { defaultSize: 70 }],
 *   orientation: 'horizontal',
 *   step: 1,
 * })
 *
 * // <div ref={ref} style={{ display: 'flex' }}>
 * //   <div style={{ flexGrow: sizes[0] }} />
 * //   <div {...getHandleProps({ index: 0 })} />
 * //   <div style={{ flexGrow: sizes[1] }} />
 * // </div>
 */
export function useSplitter<T extends HTMLElement = any>(
  options: UseSplitterOptions,
): UseSplitterReturnValue<T> {
  const {
    panels,
    orientation = 'horizontal',
    sizes: controlledSizes,
    onSizeChange,
    onCollapseChange,
    redistribute,
    step = 1,
    shiftStep = 10,
    dir = 'ltr',
    resetOnDoubleClick = true,
    enabled = true,
  } = options

  const pixelMode = detectPixelMode(options)

  const defaultSizes = panels.map(panel => panel.defaultSize)

  const [currentSizes, setCurrentSizes] = useSplitterState<SplitterPaneSize[]>({
    value: controlledSizes,
    defaultValue: defaultSizes,
    finalValue: defaultSizes,
    onChange: onSizeChange,
  })

  const [activeHandle, setActiveHandle] = useState(-1)
  const [containerSize, setContainerSize] = useState(0)

  const optionsRef = useRef(options)
  optionsRef.current = options

  const internalStateRef = useRef<SplitterInternalState>(createInitialInternalState())
  const containerRef = useRef<T | null>(null)
  const containerSizeRef = useRef(0)
  const rootFontSizeRef = useRef(16)
  const documentControllerRef = useRef<AbortController | null>(null)
  const frameRef = useRef(0)

  const preCollapseSizesRef = useRef<SplitterPaneSize[]>(defaultSizes)
  const currentSizesRef = useRef(currentSizes)
  currentSizesRef.current = currentSizes

  const collapsed = getCollapsed(currentSizes)

  /**
   * Live container measurement. Reads `optionsRef` rather than the destructured `orientation`, so a
   * mid-drag orientation change is not pinned to the value captured by this callback's empty
   * dependency list.
   */
  const measureContainer = useCallback(() => {
    const node = containerRef.current
    if (!node) {
      return 0
    }
    const rect = node.getBoundingClientRect()
    return (optionsRef.current.orientation ?? 'horizontal') === 'horizontal' ? rect.width : rect.height
  }, [])

  const updateSizes = useCallback((newSizes: SplitterPaneSize[]) => {
    currentSizesRef.current = newSizes
    setCurrentSizes(newSizes)
  }, [setCurrentSizes])

  const collapsePanel = useCallback((panelIndex: number) => {
    if (!optionsRef.current.panels[panelIndex]?.collapsible) {
      return
    }
    const raw = currentSizesRef.current
    if (sizeMagnitude(raw[panelIndex]) === 0) {
      return
    }

    const container = pixelMode ? containerSizeRef.current || measureContainer() : 0
    const rootFontSize = rootFontSizeRef.current
    const working = resolveWorkingSizes(raw, pixelMode, container, rootFontSize)

    preCollapseSizesRef.current = [...raw]
    const freedSize = working[panelIndex]
    working[panelIndex] = 0

    const neighbor = panelIndex === 0 ? 1 : panelIndex - 1
    working[neighbor] += freedSize

    updateSizes(working.map((value, i) => encodeSize(value, raw[i], pixelMode, container, rootFontSize)))
    onCollapseChange?.(panelIndex, true)
  }, [pixelMode, measureContainer, updateSizes, onCollapseChange])

  const expandPanel = useCallback((panelIndex: number) => {
    if (!optionsRef.current.panels[panelIndex]?.collapsible) {
      return
    }
    const raw = currentSizesRef.current
    if (sizeMagnitude(raw[panelIndex]) !== 0) {
      return
    }

    const container = pixelMode ? containerSizeRef.current || measureContainer() : 0
    const rootFontSize = rootFontSizeRef.current
    const working = resolveWorkingSizes(raw, pixelMode, container, rootFontSize)

    const preCollapse = preCollapseSizesRef.current
    const restoreSource = preCollapse[panelIndex] != null && sizeMagnitude(preCollapse[panelIndex]) !== 0
      ? preCollapse[panelIndex]
      : optionsRef.current.panels[panelIndex].defaultSize
    const restoreSize = resolveSize(restoreSource, pixelMode, container, rootFontSize)

    const neighbor = panelIndex === 0 ? 1 : panelIndex - 1
    const declaredMin = optionsRef.current.panels[neighbor].min
    const neighborMin = declaredMin != null ? resolveSize(declaredMin, pixelMode, container, rootFontSize) : 0
    const available = Math.max(0, working[neighbor] - neighborMin)
    const actualRestore = Math.min(restoreSize, available)

    if (actualRestore <= 0) {
      return
    }

    working[panelIndex] = actualRestore
    working[neighbor] -= actualRestore

    updateSizes(working.map((value, i) => encodeSize(value, raw[i], pixelMode, container, rootFontSize)))
    onCollapseChange?.(panelIndex, false)
  }, [pixelMode, measureContainer, updateSizes, onCollapseChange])

  const toggleCollapsePanel = useCallback((panelIndex: number) => {
    if (sizeMagnitude(currentSizesRef.current[panelIndex]) === 0) {
      expandPanel(panelIndex)
    }
    else {
      collapsePanel(panelIndex)
    }
  }, [collapsePanel, expandPanel])

  const emitCollapseTransitions = useCallback((
    prev: SplitterPaneSize[],
    next: number[],
    indices: number[],
    preCollapseSnapshot: SplitterPaneSize[],
  ) => {
    const onChange = optionsRef.current.onCollapseChange
    for (const idx of indices) {
      const wasCollapsed = sizeMagnitude(prev[idx]) === 0
      const nowCollapsed = next[idx] === 0
      if (!wasCollapsed && nowCollapsed) {
        preCollapseSizesRef.current = [...preCollapseSnapshot]
        onChange?.(idx, true)
      }
      else if (wasCollapsed && !nowCollapsed) {
        onChange?.(idx, false)
      }
    }
  }, [])

  const reset = useCallback((handleIndex: number) => {
    const raw = currentSizesRef.current

    const beforeIdx = handleIndex
    const afterIdx = handleIndex + 1
    if (beforeIdx < 0 || afterIdx >= raw.length) {
      return
    }

    const container = pixelMode ? containerSizeRef.current || measureContainer() : 0
    const rootFontSize = rootFontSizeRef.current
    const working = resolveWorkingSizes(raw, pixelMode, container, rootFontSize)
    const resolvedPanels = optionsRef.current.panels.map(panel =>
      resolvePanel(panel, pixelMode, container, rootFontSize),
    )

    // The ratio primitive is the engine's; this wrapper owns the two React
    // side-effects around it — the collapse-transition callbacks (which need the
    // raw pre-resize sizes) and the re-encode back into declared units.
    const next = resetAdjacentSizes(working, resolvedPanels, handleIndex)
    emitCollapseTransitions(raw, next, [beforeIdx, afterIdx], raw)
    updateSizes(encodeWorkingSizes(next, working, raw, pixelMode, container, rootFontSize))
  }, [emitCollapseTransitions, updateSizes, pixelMode, measureContainer])

  const containerRefCallback: React.RefCallback<T | null> = useCallback((node) => {
    containerRef.current = node
  }, [])

  useEffect(() => {
    if (!pixelMode || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const node = containerRef.current
    if (!node) {
      return undefined
    }

    let frame = 0
    const update = () => {
      const rect = node.getBoundingClientRect()
      const size = (optionsRef.current.orientation ?? 'horizontal') === 'horizontal' ? rect.width : rect.height
      rootFontSizeRef.current = getRootFontSize()
      containerSizeRef.current = size
      setContainerSize(prev => (prev !== size ? size : prev))
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    })

    observer.observe(node)
    update()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [pixelMode, orientation])

  const handleRefCallbacks = useRef<Map<number, (node: HTMLElement | null) => void>>(new Map())
  const handleElementControllers = useRef<Map<number, AbortController>>(new Map())

  /**
   * Stable per-handle ref callback. Upstream memoises the callback by index and never releases it,
   * so React does not detach/reattach listeners on every render; each element gets its own
   * `AbortController` so that re-attaching a handle (a new node under the same index) tears the
   * previous element's listeners down instead of stacking them.
   */
  const getHandleRefCallback = useCallback((handleIndex: number): React.RefCallback<HTMLElement> => {
    if (handleRefCallbacks.current.has(handleIndex)) {
      return handleRefCallbacks.current.get(handleIndex)!
    }

    const callback = (node: HTMLElement | null) => {
      const existingController = handleElementControllers.current.get(handleIndex)
      if (existingController) {
        existingController.abort()
        handleElementControllers.current.delete(handleIndex)
      }

      if (!node) {
        return
      }

      const elementController = new AbortController()
      handleElementControllers.current.set(handleIndex, elementController)

      const flushResize = (pointerEvent: PointerEvent) => {
        const s = internalStateRef.current
        if (!s.containerSize) {
          return
        }
        const opts = optionsRef.current
        const isHorizontal = (opts.orientation ?? 'horizontal') === 'horizontal'
        const isRtl = isHorizontal && opts.dir === 'rtl'
        const pointerPos = isHorizontal ? pointerEvent.clientX : pointerEvent.clientY
        const pixelDelta = (isRtl ? -1 : 1) * (pointerPos - s.startPointer)
        const delta = s.pixelMode ? pixelDelta : (pixelDelta / s.containerSize) * 100

        const resolvedPanels = opts.panels.map(panel =>
          resolvePanel(panel, s.pixelMode, s.containerSize, s.rootFontSize),
        )

        const newSizes = applyConstraints(s.startSizes, resolvedPanels, s.handleIndex, delta, opts.redistribute)

        const prevSizes = currentSizesRef.current
        emitCollapseTransitions(prevSizes, newSizes, [s.handleIndex, s.handleIndex + 1], s.startRaw)

        const encoded = encodeWorkingSizes(newSizes, s.startSizes, s.startRaw, s.pixelMode, s.containerSize, s.rootFontSize)
        currentSizesRef.current = encoded
        setCurrentSizes(encoded)
      }

      const onPointerMove = (event: PointerEvent) => {
        const s = internalStateRef.current
        if (!s.isDragging) {
          return
        }

        cancelAnimationFrame(frameRef.current)
        frameRef.current = requestAnimationFrame(() => {
          flushResize(event)
        })
      }

      const onPointerUp = (event: PointerEvent) => {
        const s = internalStateRef.current
        if (!s.isDragging) {
          return
        }

        cancelAnimationFrame(frameRef.current)
        flushResize(event)

        s.isDragging = false
        const finishedHandle = s.handleIndex
        s.handleIndex = -1

        setActiveHandle(-1)
        document.body.style.userSelect = ''
        document.body.style.webkitUserSelect = ''
        document.body.style.cursor = ''

        documentControllerRef.current?.abort()
        documentControllerRef.current = null

        optionsRef.current.onResizeEnd?.(finishedHandle, [...currentSizesRef.current])
      }

      // Declared last on purpose: `no-use-before-define` rejects an inner
      // function that is captured before its own declaration, so the drag start
      // handler follows the two handlers it registers on `document`.
      const onPointerDown = (event: PointerEvent) => {
        if (optionsRef.current.enabled === false) {
          return
        }
        if (event.button !== 0) {
          return
        }

        const container = containerRef.current
        if (!container) {
          return
        }

        const opts = optionsRef.current
        const isHorizontal = (opts.orientation ?? 'horizontal') === 'horizontal'
        const rect = container.getBoundingClientRect()
        const containerSizePx = isHorizontal ? rect.width : rect.height
        const pointerPos = isHorizontal ? event.clientX : event.clientY
        const isPixelMode = detectPixelMode(opts)
        const rootFontSize = getRootFontSize()

        const s = internalStateRef.current
        s.isDragging = true
        s.handleIndex = handleIndex
        s.startPointer = pointerPos
        s.containerSize = containerSizePx
        s.rootFontSize = rootFontSize
        s.pixelMode = isPixelMode
        s.startRaw = [...currentSizesRef.current]
        s.startSizes = resolveWorkingSizes(s.startRaw, isPixelMode, containerSizePx, rootFontSize)
        s.preCollapseSizes = [...preCollapseSizesRef.current]

        setActiveHandle(handleIndex)
        document.body.style.userSelect = 'none'
        document.body.style.webkitUserSelect = 'none'
        document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'

        opts.onResizeStart?.(handleIndex)

        documentControllerRef.current?.abort()
        documentControllerRef.current = new AbortController()
        const sig = documentControllerRef.current.signal

        document.addEventListener('pointermove', onPointerMove, { signal: sig })
        document.addEventListener('pointerup', onPointerUp, { signal: sig })
        document.addEventListener('pointercancel', onPointerUp, { signal: sig })
      }

      node.addEventListener('pointerdown', onPointerDown, { signal: elementController.signal })
    }

    handleRefCallbacks.current.set(handleIndex, callback)
    return callback
  }, [emitCollapseTransitions])

  const getHandleProps = useCallback((input: { index: number }) => {
    const { index } = input
    const orient = orientation
    const rootFontSize = rootFontSizeRef.current
    const working = resolveWorkingSizes(currentSizes, pixelMode, containerSize, rootFontSize)
    const resolvedPanels = panels.map(panel => resolvePanel(panel, pixelMode, containerSize, rootFontSize))
    const beforeSize = working[index] ?? 0
    const beforePanel = resolvedPanels[index]

    return {
      'ref': getHandleRefCallback(index),
      'role': 'separator' as const,
      'aria-orientation': orient,
      'aria-valuenow': Math.round(beforeSize),
      'aria-valuemin': Math.round(getMin(beforePanel)),
      'aria-valuemax': Math.round(getMax(beforePanel)),
      'tabIndex': 0,
      'onKeyDown': (event: React.KeyboardEvent) => {
        if (!enabled) {
          return
        }

        const isHorizontal = orient === 'horizontal'
        const isRtl = dir === 'rtl'

        const container = pixelMode ? containerSizeRef.current || measureContainer() : 0
        const liveRootFontSize = rootFontSizeRef.current
        const liveWorking = resolveWorkingSizes(currentSizes, pixelMode, container, liveRootFontSize)
        const livePanels = panels.map(panel => resolvePanel(panel, pixelMode, container, liveRootFontSize))
        const liveBeforePanel = livePanels[index]
        const liveAfterPanel = livePanels[index + 1]

        let delta = 0
        const currentStep = resolveStep(event.shiftKey ? shiftStep : step, pixelMode, container, liveRootFontSize)

        switch (event.key) {
          case 'ArrowLeft': {
            if (!isHorizontal) {
              return
            }
            delta = isRtl ? currentStep : -currentStep
            break
          }
          case 'ArrowRight': {
            if (!isHorizontal) {
              return
            }
            delta = isRtl ? -currentStep : currentStep
            break
          }
          case 'ArrowUp': {
            if (isHorizontal) {
              return
            }
            delta = -currentStep
            break
          }
          case 'ArrowDown': {
            if (isHorizontal) {
              return
            }
            delta = currentStep
            break
          }
          case 'Home': {
            delta = -(liveWorking[index] - getMin(liveBeforePanel))
            break
          }
          case 'End': {
            delta = getMax(liveBeforePanel) - liveWorking[index]
            break
          }
          case 'Enter': {
            const beforeCollapsible = liveBeforePanel?.collapsible
            const afterCollapsible = liveAfterPanel?.collapsible

            if (beforeCollapsible && liveWorking[index] <= liveWorking[index + 1]) {
              toggleCollapsePanel(index)
              event.preventDefault()
              return
            }
            if (afterCollapsible) {
              toggleCollapsePanel(index + 1)
              event.preventDefault()
              return
            }
            if (beforeCollapsible) {
              toggleCollapsePanel(index)
              event.preventDefault()
              return
            }
            return
          }
          default:
            return
        }

        event.preventDefault()

        if (delta !== 0) {
          const newSizes = applyConstraints(liveWorking, livePanels, index, delta, redistribute)
          emitCollapseTransitions(currentSizes, newSizes, [index, index + 1], currentSizes)
          updateSizes(encodeWorkingSizes(newSizes, liveWorking, currentSizes, pixelMode, container, liveRootFontSize))
        }
      },
      'onDoubleClick': () => {
        if (!enabled || !resetOnDoubleClick) {
          return
        }
        reset(index)
      },
      'data-active': activeHandle === index || undefined,
      'data-orientation': orient,
    }
  }, [
    orientation,
    currentSizes,
    panels,
    pixelMode,
    containerSize,
    enabled,
    dir,
    step,
    shiftStep,
    resetOnDoubleClick,
    activeHandle,
    redistribute,
    measureContainer,
    getHandleRefCallback,
    toggleCollapsePanel,
    updateSizes,
    emitCollapseTransitions,
    reset,
  ])

  useEffect(() => () => {
    documentControllerRef.current?.abort()
    documentControllerRef.current = null
    handleElementControllers.current.forEach(controller => controller.abort())
    handleElementControllers.current.clear()
    cancelAnimationFrame(frameRef.current)

    if (internalStateRef.current.isDragging) {
      internalStateRef.current.isDragging = false
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
      document.body.style.cursor = ''
    }
  }, [])

  return {
    ref: containerRefCallback,
    sizes: currentSizes,
    pixelMode,
    collapsed,
    activeHandle,
    getHandleProps,
    setSizes: updateSizes,
    collapse: collapsePanel,
    expand: expandPanel,
    toggleCollapse: toggleCollapsePanel,
    reset,
  }
}
