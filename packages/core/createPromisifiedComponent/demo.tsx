import { createPromisifiedComponent } from '@reause/core'
import { useState } from 'react'

type DialogResult = 'ok' | 'cancel'

const Promisified = createPromisifiedComponent<DialogResult, [string]>()

function asyncFn() {
  return new Promise<DialogResult>((resolve) => {
    setTimeout(() => {
      resolve('ok')
    }, 1000)
  })
}

export default function CreatePromisifiedComponentDemo() {
  const [logs, setLogs] = useState<string[]>([])

  async function open(idx: number) {
    // eslint-disable-next-line no-console
    console.log(idx, 'Before')
    setLogs(prev => [...prev, `${idx} Before`])
    const result = await Promisified.start(`Hello ${idx}`)
    // eslint-disable-next-line no-console
    console.log(idx, 'After', result)
    setLogs(prev => [...prev, `${idx} After ${result}`])
  }

  return (
    <div>
      <p style={{ marginBlockEnd: '0.75rem' }}>
        Call your UI as a promise:
        {' '}
        <code>start()</code>
        {' '}
        mounts the template below, and the awaited call returns once the
        dialog is resolved. Open the console to see the logs.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={() => { void open(1) }}>
          Open 1
        </button>
        <button type="button" onClick={() => { void open(2) }}>
          Open 2
        </button>
        <button
          type="button"
          onClick={() => {
            open(1)
            open(2)
          }}
        >
          Open 1 & 2
        </button>
      </div>
      <ul style={{ marginBlock: '0.75rem 0', fontSize: '0.9em', opacity: 0.8 }}>
        {logs.map(log => <li key={log}>{log}</li>)}
      </ul>
      <Promisified>
        {({ resolve, args, isResolving }) => (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.1)',
              zIndex: 30,
            }}
          >
            <div
              style={{
                border: '1px solid var(--vp-c-divider)',
                borderRadius: '8px',
                padding: '16px',
                // Theme-aware surface: `--vp-c-bg` / `--vp-c-text-1` flip with
                // VitePress's dark mode (`html.dark`), so the dialog stays
                // readable instead of forcing a white card on a dark page.
                background: 'var(--vp-c-bg)',
                color: 'var(--vp-c-text-1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div>
                Dialog
                {' '}
                {args[0]}
              </div>
              <p style={{ margin: '0.5rem 0' }}>Open console to see logs</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => resolve('cancel')}>
                  Cancel
                </button>
                <button type="button" disabled={isResolving} onClick={() => resolve(asyncFn())}>
                  {isResolving ? 'Confirming...' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Promisified>
    </div>
  )
}
