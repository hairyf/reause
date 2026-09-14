import { useFetch } from '@reause/core'
import { useState } from 'react'

export default function UseFetchDemo() {
  const [url, setUrl] = useState('https://httpbin.org/get')
  // `refetch` is a plain boolean option — a state change re-runs the hook
  const [refetchOn, setRefetchOn] = useState(false)

  const toggleRefetch = () => {
    setRefetchOn(current => !current)
  }

  const {
    data,
    error,
    abort,
    statusCode,
    isFetching,
    isFinished,
    canAbort,
    execute,
  } = useFetch(url, { refetch: refetchOn }).get()

  let parsedData: unknown = null
  try {
    parsedData = data ? JSON.parse(data as string) : null
  }
  catch {
    parsedData = null
  }

  return (
    <div>
      <div>
        <p>
          The following URLs can be used to test different features of useFetch
        </p>
        <div>
          Normal Request:
          {' '}
          <code>https://httpbin.org/get</code>
        </div>
        <div>
          Abort Request:
          {' '}
          <code>https://httpbin.org/delay/10</code>
        </div>
        <div>
          Response Error:
          {' '}
          <code>http://httpbin.org/status/500</code>
        </div>
      </div>

      <p>
        <input value={url} onChange={event => setUrl(event.target.value)} type="text" />
        {' '}
        <button onClick={() => execute()}>
          Execute
        </button>
        {' '}
        <button onClick={toggleRefetch}>
          {refetchOn ? 'Refetch On' : 'Refetch Off'}
        </button>
        {canAbort && (
          <>
            {' '}
            <button className="orange" onClick={() => abort()}>
              Abort
            </button>
          </>
        )}
      </p>
      <pre className="code-block">
        {JSON.stringify({
          isFinished,
          isFetching,
          canAbort,
          statusCode,
          error,
          data: parsedData,
        }, null, 2)}
      </pre>
    </div>
  )
}
