import { useFocusReturn } from '@reause/core'
import { useState } from 'react'

const overlayStyle = {
  marginTop: '0.75rem',
  padding: '1rem',
  border: '1px solid var(--vp-c-divider)',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
  maxWidth: '22rem',
}

export default function UseFocusReturnDemo() {
  const [opened, setOpened] = useState(false)
  const returnFocus = useFocusReturn({ opened })

  return (
    <div>
      <p>
        Focus the text field (or the button), open the overlay, then close it —
        focus returns to whatever was active before the overlay opened.
      </p>

      <input type="text" placeholder="Focus me before opening" style={{ padding: '4px 8px' }} />

      <div style={{ marginTop: '0.5rem' }}>
        <button type="button" onClick={() => setOpened(true)}>
          Open overlay
        </button>
      </div>

      {opened && (
        <div style={overlayStyle}>
          <p style={{ margin: 0 }}>The overlay moved focus to its own input.</p>
          <input type="text" autoFocus placeholder="Overlay input" style={{ padding: '4px 8px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setOpened(false)}>
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                returnFocus()
                setOpened(false)
              }}
            >
              Close and call returnFocus()
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
