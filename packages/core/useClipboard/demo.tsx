import { useClipboard, usePermission } from '@reause/core'
import { useState } from 'react'

export default function UseClipboardDemo() {
  const [input, setInput] = useState('')
  const [text, copy, { isSupported }] = useClipboard()
  const permissionRead = usePermission('clipboard-read')
  const permissionWrite = usePermission('clipboard-write')

  return (
    <div>
      {isSupported && (
        <>
          <p>
            Clipboard Permission: read
            {' '}
            <b>{permissionRead}</b>
            {' '}
            | write
            {' '}
            <b>{permissionWrite}</b>
          </p>
          <p>
            Current copied:
            {' '}
            <code>{text || 'none'}</code>
          </p>
          <input
            type="text"
            value={input}
            onChange={event => setInput(event.target.value)}
          />
          <button type="button" onClick={() => copy(input)}>
            Copy
          </button>
        </>
      )}
      {!isSupported && <p>Your browser does not support Clipboard API</p>}
    </div>
  )
}
