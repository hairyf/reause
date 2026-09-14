import { useSplitter } from '@reause/core'

function paneStyle(size: number | `${number}%` | `${number}px` | `${number}rem`) {
  const isFixed = typeof size === 'string' && (size.endsWith('px') || size.endsWith('rem'))
  return isFixed
    ? { flexBasis: size, flexGrow: 0 }
    : { flexGrow: Number(size), flexBasis: 0 }
}

export default function UseSplitterDemo() {
  const horizontal = useSplitter({
    panels: [
      { defaultSize: 30, min: 10, collapsible: true },
      { defaultSize: 70, min: 10 },
    ],
  })

  const vertical = useSplitter({
    panels: [{ defaultSize: '120px', min: '60px' }, { defaultSize: 100 }],
    orientation: 'vertical',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <p style={{ margin: '0 0 6px' }}>
          Drag the divider, focus it and use the arrow keys, or double-click it to
          reset.
        </p>
        <p>
          Sizes:
          {' '}
          {String(horizontal.sizes[0])}
          {' / '}
          {String(horizontal.sizes[1])}
        </p>
        <div
          ref={horizontal.ref}
          style={{ display: 'flex', width: 420, height: 90, border: '1px solid #ccc' }}
        >
          <div style={{ ...paneStyle(horizontal.sizes[0]), overflow: 'hidden' }}>A</div>
          <div
            {...horizontal.getHandleProps({ index: 0 })}
            style={{
              width: 6,
              flex: '0 0 6px',
              cursor: 'col-resize',
              background: horizontal.activeHandle === 0 ? '#3b82f6' : '#e5e7eb',
            }}
          />
          <div style={{ ...paneStyle(horizontal.sizes[1]), overflow: 'hidden' }}>B</div>
        </div>
      </div>

      <div>
        <p style={{ margin: '0 0 6px' }}>
          Vertical, with a fixed
          {' '}
          <code>120px</code>
          {' '}
          pane — this layout is in pixel mode, so the second pane is a percentage of
          the container.
        </p>
        <div
          ref={vertical.ref}
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 420,
            height: 160,
            border: '1px solid #ccc',
          }}
        >
          <div style={{ ...paneStyle(vertical.sizes[0]), overflow: 'hidden' }}>Fixed</div>
          <div
            {...vertical.getHandleProps({ index: 0 })}
            style={{
              height: 6,
              flex: '0 0 6px',
              cursor: 'row-resize',
              background: vertical.activeHandle === 0 ? '#3b82f6' : '#e5e7eb',
            }}
          />
          <div style={{ ...paneStyle(vertical.sizes[1]), overflow: 'hidden' }}>Flexible</div>
        </div>
      </div>
    </div>
  )
}
