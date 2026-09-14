import { useRef } from 'react'
import { useUpdate } from '../useUpdate'

// The pristine `Set.prototype` methods, captured once at module scope.
const proto = Set.prototype

/**
 * Map from react-hookz `useSet`
 * (`source/react-hookz/src/useSet/`).
 *
 * @param values Initial values for the underlying `Set` constructor. Read only
 * by the first render; `null` and `undefined` both mean "empty".
 *
 * @example
 * const set = useSet(['a'])
 * set.add('b') // re-renders; returns the same Set
 * set.has('b') // true
 * set.delete('a') // re-renders; returns true
 * set.size // 1
 */
export function useSet<T = any>(values?: readonly T[] | null): Set<T> {
  const setRef = useRef<Set<T>>(undefined)
  const update = useUpdate()

  if (!setRef.current) {
    const set = new Set<T>(values)

    setRef.current = set

    set.add = (...args) => {
      proto.add.apply(set, args)
      update()
      return set
    }

    set.clear = (...args) => {
      proto.clear.apply(set, args)
      update()
    }

    set.delete = (...args) => {
      const result = proto.delete.apply(set, args)
      update()
      return result
    }
  }

  return setRef.current
}
