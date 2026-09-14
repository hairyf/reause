import { useElementVisibility } from '@reause/core'
import { useRef } from 'react'

export default function UseElementVisibilityDemo() {
  const el = useRef<HTMLDivElement | null>(null)
  const isVisible = useElementVisibility(el)

  return (
    <div>
      <p style={{ marginBottom: 8, fontSize: '0.875rem', opacity: 0.8 }}>
        Info on the right bottom corner
      </p>
      <div
        ref={el}
        style={{
          border: '2px dashed #0ea5e9',
          padding: 10,
          maxWidth: '100%',
        }}
      >
        Target Element (scroll down)
      </div>
      <div
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          border: '2px dashed #ccc',
          padding: '0.5rem 1rem',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {'Element '}
        <strong>{isVisible ? 'inside' : 'outside'}</strong>
        {' the viewport'}
      </div>
    </div>
  )
}
