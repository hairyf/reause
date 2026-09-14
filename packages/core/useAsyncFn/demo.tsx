import { useAsyncFn } from '@reause/core'
import { useState } from 'react'

const REQUEST_DELAY = 600

function fakeRequest(shouldFail: boolean): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail)
        reject(new Error('The demo request failed'))
      else
        resolve(`item #${Math.floor(Math.random() * 100)} fetched`)
    }, REQUEST_DELAY)
  })
}

export default function UseAsyncFnDemo() {
  const [shouldFail, setShouldFail] = useState(false)
  const [awaited, setAwaited] = useState('nothing awaited yet')
  const [state, doFetch] = useAsyncFn(async () => fakeRequest(shouldFail))

  const status = state.loading
    ? 'loading…'
    : state.error
      ? `error: ${state.error.message}`
      : state.value === undefined
        ? 'idle — run the async function'
        : `value: ${state.value}`

  async function run() {
    // the callback returns the raw promise; a rejection resolves with the error
    const result = await doFetch()
    setAwaited(`doFetch() resolved with ${String(result)}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div className="text-primary text-lg font-bold">
        State:
        {' '}
        {status}
      </div>
      <pre className="code-block ml-2">
        {JSON.stringify(state, null, 2)}
      </pre>
      <div>{awaited}</div>
      <label>
        <input
          type="checkbox"
          checked={shouldFail}
          onChange={event => setShouldFail(event.target.checked)}
        />
        {' make the request fail'}
      </label>
      <button type="button" onClick={() => void run()}>
        Run async function
      </button>
    </div>
  )
}
