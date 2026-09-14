import { useIsomorphicLayoutEffect } from '@reause/shared'
import { useId as useReactId, useRef, useState } from 'react'

// Port of `randomId` from `@mantine/hooks`
// (`source/mantine/packages/@mantine/hooks/src/utils/random-id/random-id.ts`) —
// unchanged from upstream, and unexported on purpose: reause ships no equivalent
// helper to reuse and `packages/shared/**` is outside this port's scope.
// The `mantine-` prefix is the same one the pre-mount id carries, so both phases
// have the same shape in markup.
function randomId(prefix = 'mantine-'): string {
  return `${prefix}${Math.random().toString(36).slice(2, 11)}`
}

// `useLayoutEffect` warns when a component renders on the server, so the post-mount swap uses the
// effect variant there — upstream's `useIsomorphicEffect`
// (`source/mantine/packages/@mantine/hooks/src/use-isomorphic-effect/`). That choice is the shared
// `useIsomorphicLayoutEffect` (#923), imported above instead of aliased locally, so the isomorphic
// branch lives in exactly one place (reference-chain rule).

/**
 * Map from @mantine/hooks `useId`
 * (`source/mantine/packages/@mantine/hooks/src/use-id/use-id.ts`).
 *
 * @see https://mantine.dev/hooks/use-id/
 *
 * @example
 * const id = useId() // 'mantine-<react-id>' on the first render, then 'mantine-xxxxxxxxx'
 * const fixed = useId('my-static-id') // always 'my-static-id'
 */
export function useId(staticId?: string): string {
  const reactId = useReactId()
  const [uuid, setUuid] = useState(`mantine-${reactId.replace(/:/g, '')}`)
  const hasInitializedRef = useRef(false)

  useIsomorphicLayoutEffect(() => {
    if (hasInitializedRef.current)
      return
    hasInitializedRef.current = true
    setUuid(randomId())
  }, [])

  if (typeof staticId === 'string')
    return staticId

  return uuid
}
