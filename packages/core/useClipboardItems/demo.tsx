import { useClipboardItems, usePermission } from '@reause/core'
import { useEffect, useState } from 'react'

const mime = 'text/plain'

export default function UseClipboardItemsDemo() {
  const [input, setInput] = useState('')
  const [content, copy, { isSupported, read }] = useClipboardItems()
  const [computedText, setComputedText] = useState('')
  const [computedMimeType, setComputedMimeType] = useState('')
  const permissionRead = usePermission('clipboard-read')
  const permissionWrite = usePermission('clipboard-write')

  useEffect(() => {
    let cancelled = false
    Promise.all(content.map(item => item.getType(mime)))
      .then(async (blobs) => {
        if (cancelled)
          return
        setComputedMimeType(blobs.map(blob => blob.type).join(', '))
        setComputedText((await Promise.all(blobs.map(blob => blob.text()))).join(', '))
      })
    return () => {
      cancelled = true
    }
  }, [content])

  function createClipboardItems(text: string) {
    const blob = new Blob([text], { type: mime })
    return new ClipboardItem({ [mime]: blob })
  }

  return (
    <div>
      {isSupported
        ? (
            <div>
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
                <code>{computedText ? `${computedText} (mime: ${computedMimeType})` : 'none'}</code>
              </p>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                type="text"
              />
              <button onClick={() => copy([createClipboardItems(input)])}>
                Copy
              </button>
              <button onClick={() => read()}>
                Manual read
              </button>
            </div>
          )
        : (
            <p>Your browser does not support Clipboard API</p>
          )}
    </div>
  )
}
