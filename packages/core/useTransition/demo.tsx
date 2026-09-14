import type { CSSProperties } from 'react'
import { TransitionPresets, useTransition } from '@reause/core'
import { useState } from 'react'

// Custom easing functions can control the progress of a transition
function easeOutElastic(n: number) {
  return n === 0
    ? 0
    : n === 1
      ? 1
      : (2 ** (-10 * n)) * Math.sin((n * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
}

// mirror upstream `demo.vue` scoped styles: `.track`, `.number.track` and
// `.vector.track`
const trackStyle: CSSProperties = {
  background: 'rgba(125, 125, 125, 0.3)',
  borderRadius: '0.5rem',
  maxWidth: '20rem',
  width: '100%',
}

const numberTrackStyle: CSSProperties = {
  ...trackStyle,
  height: '1rem',
  margin: '0.5rem 0',
  padding: '0 0.5rem',
}

const vectorTrackStyle: CSSProperties = {
  ...trackStyle,
  padding: '0.5rem',
}

const sledStyle: CSSProperties = {
  background: 'var(--vp-c-brand)',
  borderRadius: '50%',
  height: '1rem',
  position: 'absolute',
  width: '1rem',
}

export default function UseTransitionDemo() {
  const [base, setBase] = useState(0)
  const [baseVector, setBaseVector] = useState<[number, number]>([0, 0])

  const cubicBezierNumber = useTransition(base, {
    duration: 1500,
    easing: [0.75, 0, 0.25, 1],
  })

  const customFnNumber = useTransition(base, {
    duration: 1500,
    easing: easeOutElastic,
  })

  const vector = useTransition(baseVector, {
    duration: 1500,
    easing: TransitionPresets.easeOutExpo,
  })

  function toggle() {
    setBase(base === 100 ? 0 : 100)
    setBaseVector([Math.round(Math.random() * 100), Math.round(Math.random() * 100)])
  }

  return (
    <div>
      <button onClick={toggle} type="button">
        Transition
      </button>

      <p style={{ margin: '0.5rem 0' }}>
        Cubic bezier curve:
        {' '}
        <b>{cubicBezierNumber.toFixed(2)}</b>
      </p>
      <div style={numberTrackStyle}>
        <div style={{ position: 'relative' }}>
          <div style={{ ...sledStyle, left: `${cubicBezierNumber}%`, transform: 'translateX(-50%)' }} />
        </div>
      </div>

      <p style={{ margin: '0.5rem 0' }}>
        Custom function:
        {' '}
        <b>{customFnNumber.toFixed(2)}</b>
      </p>
      <div style={numberTrackStyle}>
        <div style={{ position: 'relative' }}>
          <div style={{ ...sledStyle, left: `${customFnNumber}%`, transform: 'translateX(-50%)' }} />
        </div>
      </div>

      <p style={{ margin: '0.5rem 0' }}>
        Vector:
        {' '}
        <b>
          [
          {vector[0].toFixed(2)}
          ,
          {' '}
          {vector[1].toFixed(2)}
          ]
        </b>
      </p>
      <div style={vectorTrackStyle}>
        <div style={{ paddingBottom: '30%', position: 'relative' }}>
          <div style={{ ...sledStyle, left: `${vector[0]}%`, top: `${vector[1]}%`, transform: 'translateX(-50%) translateY(-50%)' }} />
        </div>
      </div>
    </div>
  )
}
