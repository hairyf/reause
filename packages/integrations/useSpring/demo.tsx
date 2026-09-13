import { animated } from '@react-spring/web'
import { useSpring } from '@reause/integrations'
import { useState } from 'react'

/**
 * Minimal on purpose: `useSpring` is a re-export, so the demo only has to show
 * the upstream hook driving an `animated` element. `animated` comes from
 * `@react-spring/web` itself — it is explicitly out of scope for reause.
 */
export default function UseSpringDemo() {
  const [shown, setShown] = useState(false)
  const styles = useSpring({
    opacity: shown ? 1 : 0,
    y: shown ? 0 : 16,
  })

  return (
    <div>
      <button type="button" onClick={() => setShown(value => !value)}>
        {shown ? 'Hide' : 'Show'}
      </button>
      <animated.div style={styles}>Animated content</animated.div>
    </div>
  )
}
