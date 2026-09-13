import { useIsomorphicLayoutEffect } from '@reause/shared'
import { useRef, useState } from 'react'

export default function UseIsomorphicLayoutEffectDemo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number>()

  // On the client this is `useLayoutEffect`: the box is measured after the DOM
  // is committed but before the browser paints, so the value is on screen in the
  // same frame. During the docs' server render it degrades to `useEffect`.
  useIsomorphicLayoutEffect(() => {
    setWidth(boxRef.current?.getBoundingClientRect().width)
  }, [])

  return (
    <div>
      <div
        ref={boxRef}
        style={{ width: '160px', height: '32px', background: '#8884', lineHeight: '32px', textAlign: 'center' }}
      >
        measured
      </div>
      <p>
        Measured width before paint:
        {' '}
        <strong>{width ?? '—'}</strong>
      </p>
    </div>
  )
}
