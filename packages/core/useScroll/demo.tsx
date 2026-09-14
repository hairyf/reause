import { useScroll } from '@reause/core'
import { useEffect, useRef, useState } from 'react'

// Upstream's `BooleanDisplay.vue` theme component: `text-primary` for true,
// `text-orange-400 dark:text-orange-300` for false.
function BooleanDisplay({ value }: { value: boolean }) {
  return (
    <span className={value ? 'text-primary' : 'text-orange-400 dark:text-orange-300'}>
      {value ? 'true' : 'false'}
    </span>
  )
}

// Port of VueUse's `demo.vue` (`source/vueuse/packages/core/useScroll/`): the
// template's UnoCSS classes are mirrored verbatim, with the attributify
// attributes (`position="absolute left-0 top-0"`, `bg="gray-500/5"`,
// `p="x-2 y-1"`, `text="right" opacity="75"`) folded into `className`, the
// form the co-located React demos use.
export default function UseScrollDemo() {
  const el = useRef<HTMLDivElement>(null)
  const [smooth, setSmooth] = useState(false)
  // upstream's `shallowRef<'h-[500px]' | 'h-[200px]'>` — the height is a class
  // name (not a pixel value) so the utility class stays scannable by UnoCSS
  const [height, setHeight] = useState<'h-[200px]' | 'h-[500px]'>('h-[500px]')
  const behavior = smooth ? 'smooth' : 'auto'

  const { x, y, isScrolling, arrivedState, directions, measure, setX, setY } = useScroll(el, { behavior })
  const { left, right, top, bottom } = arrivedState
  const { left: toLeft, right: toRight, top: toTop, bottom: toBottom } = directions

  // upstream's `displayX` / `displayY` computeds (`get: x.toFixed(1)` /
  // `set: parseFloat`): the inputs read `x` / `y` directly and write `setX` /
  // `setY`, so no extra state has to be kept in sync
  function updateScrollPosition() {
    setHeight(h => (h === 'h-[500px]' ? 'h-[200px]' : 'h-[500px]'))
  }

  // upstream's `nextTick(() => measure())`: re-measure once the new height has
  // been committed to the DOM
  useEffect(() => {
    measure()
  }, [height, measure])

  return (
    <div className="flex">
      <div ref={el} className="w-300px h-300px m-auto overflow-scroll bg-gray-500/5 rounded">
        <div className={`w-500px relative ${height}`}>
          <div className="absolute left-0 top-0 bg-gray-500/5 px-2 py-1">
            TopLeft
          </div>
          <div className="absolute left-0 bottom-0 bg-gray-500/5 px-2 py-1">
            BottomLeft
          </div>
          <div className="absolute right-0 top-0 bg-gray-500/5 px-2 py-1">
            TopRight
          </div>
          <div className="absolute right-0 bottom-0 bg-gray-500/5 px-2 py-1">
            BottomRight
          </div>
          <div className="absolute left-1/3 top-1/3 bg-gray-500/5 px-2 py-1">
            Scroll Me
          </div>
        </div>
      </div>
      <div className="m-auto w-280px pl-4">
        <div className="px-6 py-4 rounded grid grid-cols-[120px_auto] gap-2 bg-gray-500/5">
          <span className="text-right opacity-75 py-4">X Position</span>
          <div className="text-primary">
            <div>
              <input
                type="number"
                min={0}
                max={200}
                step={10}
                value={x.toFixed(1)}
                onChange={e => setX(Number.parseFloat(e.target.value))}
                className="w-full !min-w-0"
              />
            </div>
          </div>
          <span className="text-right opacity-75 py-4">Y Position</span>
          <div className="text-primary">
            <div>
              <input
                type="number"
                min={0}
                max={100}
                step={10}
                value={y.toFixed(1)}
                onChange={e => setY(Number.parseFloat(e.target.value))}
                className="w-full !min-w-0"
              />
            </div>
          </div>
          <div className="col-span-full flex items-center justify-between">
            Measure
            <button onClick={updateScrollPosition}>
              Toggle height
            </button>
          </div>
          <label htmlFor="smooth-scrolling-option" className="whitespace-nowrap text-right opacity-75">Smooth scrolling</label>
          <span>
            <input
              id="smooth-scrolling-option"
              type="checkbox"
              checked={smooth}
              onChange={e => setSmooth(e.target.checked)}
            />
          </span>
          <span className="text-right opacity-75">isScrolling</span>
          <BooleanDisplay value={isScrolling} />
          <div className="text-right opacity-75">
            Top Arrived
          </div>
          <BooleanDisplay value={top} />
          <div className="text-right opacity-75">
            Right Arrived
          </div>
          <BooleanDisplay value={right} />
          <div className="text-right opacity-75">
            Bottom Arrived
          </div>
          <BooleanDisplay value={bottom} />
          <div className="text-right opacity-75">
            Left Arrived
          </div>
          <BooleanDisplay value={left} />
          <div className="text-right opacity-75">
            Scrolling Up
          </div>
          <BooleanDisplay value={toTop} />
          <div className="text-right opacity-75">
            Scrolling Right
          </div>
          <BooleanDisplay value={toRight} />
          <div className="text-right opacity-75">
            Scrolling Down
          </div>
          <BooleanDisplay value={toBottom} />
          <div className="text-right opacity-75">
            Scrolling Left
          </div>
          <BooleanDisplay value={toLeft} />
        </div>
      </div>
    </div>
  )
}
