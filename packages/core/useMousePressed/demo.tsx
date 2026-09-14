import { useMousePressed } from '@reause/core'
import { useRef, useState } from 'react'

export default function UseMousePressedDemo() {
  const el = useRef<HTMLDivElement>(null)
  const [withTarget, setWithTarget] = useState(false)
  const target = withTarget ? el : undefined

  const { pressed, sourceType } = useMousePressed({ target })

  return (
    <div ref={el} className="select-none">
      <pre lang="yaml">
        {`pressed: ${pressed}\nsourceType: ${sourceType}`}
      </pre>
      <div>
        <p>Tracking on</p>
        <button className="ml-2 button small" onClick={() => setWithTarget(v => !v)}>
          {withTarget ? 'Demo section' : 'Entire page'}
        </button>
      </div>
    </div>
  )
}
