import { useRef } from 'react'
import { useUpdate } from '../useUpdate'

// The pristine `Map.prototype` methods, captured once at module scope.
const proto = Map.prototype

/**
 * Map from react-hookz `useMap`
 * (`source/react-hookz/src/useMap/`).
 *
 * @param entries Initial entries for the underlying `Map` constructor. Read
 * only by the first render; `null` and `undefined` both mean "empty".
 *
 * @example
 * const map = useMap([['a', 1]])
 * map.set('b', 2) // re-renders; returns the same Map
 * map.get('b') // 2
 * map.delete('a') // re-renders; returns true
 * map.size // 1
 */
export function useMap<K = any, V = any>(entries?: ReadonlyArray<readonly [K, V]> | null): Map<K, V> {
  const mapRef = useRef<Map<K, V>>(undefined)
  const update = useUpdate()

  if (!mapRef.current) {
    const map = new Map<K, V>(entries)

    mapRef.current = map

    map.set = (...args) => {
      proto.set.apply(map, args)
      update()
      return map
    }

    map.clear = (...args) => {
      proto.clear.apply(map, args)
      update()
    }

    map.delete = (...args) => {
      const existed = proto.delete.apply(map, args)
      update()

      return existed
    }
  }

  return mapRef.current
}
