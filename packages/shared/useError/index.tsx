import { useCallback, useEffect, useState } from 'react'

/**
 * Map from react-use `useError`.
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
