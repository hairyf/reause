import type { CSSProperties } from 'react'
import { useCollapse } from '@reause/core'
import { useState } from 'react'

const panelStyle: CSSProperties = {
  background: 'var(--vp-c-brand-soft)',
  borderRadius: '0.5rem',
  padding: '1rem',
}

export default function UseCollapseDemo() {
  const [expanded, setExpanded] = useState(false)
  const [keepMounted, setKeepMounted] = useState(false)

  const { state, getCollapseProps } = useCollapse({ expanded, keepMounted })

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={() => setExpanded(value => !value)} type="button">
          {expanded ? 'Collapse' : 'Expand'}
        </button>
        <label>
          <input
            checked={keepMounted}
            onChange={event => setKeepMounted(event.target.checked)}
            type="checkbox"
          />
          {' keepMounted'}
        </label>
      </div>

      <p style={{ margin: '0.5rem 0' }}>
        state:
        {' '}
        <b>{state}</b>
        {' — '}
        {keepMounted
          ? 'keepMounted on: the collapsed panel keeps its height: 0 box instead of display: none'
          : 'keepMounted off: the collapsed panel is hidden with display: none'}
      </p>

      <div {...getCollapseProps()}>
        <div style={panelStyle}>
          <p style={{ margin: 0 }}>This content is collapsible.</p>
          <p style={{ margin: 0 }}>It animates its height when toggled.</p>
          <p style={{ margin: 0 }}>Third line of content for height.</p>
        </div>
      </div>
    </div>
  )
}
