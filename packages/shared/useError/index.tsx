import { useCallback, useEffect, useState } from 'react'

/**
 * React port of react-use's `useError`.
 *
 * Map from react-use `useError`
 * Mapping: mirrors the upstream hook as-is — the `error` state stays internal
 * (react-use never exposes it) and only the `dispatchError` callback is
 * returned. The error is re-thrown from a `useEffect` keyed on that state, so
 * it surfaces on the render **after** the dispatch and the nearest Error
 * Boundary catches it; `dispatchError` itself never throws. Upstream ships this
 * hook as a default export, reause keeps the same API shape behind a named
 * export. React-only capability: Vue has no render-throw / Error Boundary
 * equivalent, so VueUse can never provide a counterpart.
 *
 * @example
 * const dispatchError = useError()
 * dispatchError(new Error('boom')) // re-thrown from the next render
 */
export function useError(): (err: Error) => void {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  const dispatchError = useCallback((err: Error) => {
    setError(err)
  }, [])

  return dispatchError
}
