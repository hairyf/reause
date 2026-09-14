import { useCallback, useEffect, useRef, useState } from 'react'

type DescriptorNamePolyfill
  = | 'accelerometer'
    | 'accessibility-events'
    | 'ambient-light-sensor'
    | 'background-sync'
    | 'camera'
    | 'clipboard-read'
    | 'clipboard-write'
    | 'gyroscope'
    | 'magnetometer'
    | 'microphone'
    | 'notifications'
    | 'payment-handler'
    | 'persistent-storage'
    | 'push'
    | 'speaker'
    | 'local-fonts'

export type GeneralPermissionDescriptor
  = | PermissionDescriptor
    | { name: DescriptorNamePolyfill }

export interface UsePermissionOptions<Controls extends boolean = false> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls
  /**
   * Specify a custom `navigator` instance (upstream `ConfigurableNavigator`), e.g. when the
   * Permissions API should be queried against an iframe or a testing environment instead of the
   * global `navigator`. Defaults to the global `navigator`; substitution only happens for
   * `undefined`.
   */
  navigator?: Navigator
}

export type UsePermissionReturn = PermissionState

export interface UsePermissionReturnWithControls {
  state: UsePermissionReturn
  isSupported: boolean
  query: () => Promise<PermissionStatus | undefined>
}

/**
 * Map from @vueuse/core `usePermission`
 * (`source/vueuse/packages/core/usePermission/`).
 *
 * @example
 * const microphoneAccess = usePermission('microphone')
 */
export function usePermission(
  permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'],
  options?: UsePermissionOptions<false>,
): UsePermissionReturn
export function usePermission(
  permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'],
  options: UsePermissionOptions<true>,
): UsePermissionReturnWithControls
export function usePermission(
  permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'],
  options: UsePermissionOptions<boolean> = {},
): UsePermissionReturn | UsePermissionReturnWithControls {
  const { controls = false } = options

  // The effect re-queries when the descriptor changes; serializing lets
  // callers pass inline object literals without re-querying every render.
  const descKey = JSON.stringify(
    typeof permissionDesc === 'string' ? { name: permissionDesc } : permissionDesc,
  )

  const [state, setState] = useState<PermissionState>('prompt')
  const [isSupported, setIsSupported] = useState(false)
  const statusRef = useRef<PermissionStatus | undefined>(undefined)
  const descKeyRef = useRef(descKey)
  // set by the mount-effect cleanup so an in-flight query that resolves after
  // unmount neither re-attaches a listener nor sets state
  const disposedRef = useRef(false)

  // latest options reachable from the stable `query` (a new options object
  // per render must not change `query`'s identity)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const update = useCallback(() => {
    setState(statusRef.current?.state ?? 'prompt')
  }, [])

  const query = useCallback(async (): Promise<PermissionStatus | undefined> => {
    const nav = optionsRef.current.navigator === undefined
      ? (typeof navigator === 'undefined' ? undefined : navigator)
      : optionsRef.current.navigator
    const permissions = nav?.permissions
    setIsSupported(!!permissions)
    if (!permissions)
      return undefined

    const key = descKey
    let status: PermissionStatus | undefined
    try {
      status = await permissions.query(JSON.parse(key) as PermissionDescriptor)
    }
    catch {
      status = undefined
    }

    // a newer query (changed descriptor) or an unmounted component supersedes
    // this one — never re-attach a listener or set state afterwards
    if (descKeyRef.current !== key || disposedRef.current)
      return status

    if (statusRef.current !== status) {
      statusRef.current?.removeEventListener('change', update)
      status?.addEventListener('change', update)
      statusRef.current = status
    }
    update()
    return status
  }, [descKey, update])

  useEffect(() => {
    descKeyRef.current = descKey
  })

  useEffect(() => {
    disposedRef.current = false
    void query()
    return () => {
      disposedRef.current = true
      statusRef.current?.removeEventListener('change', update)
      statusRef.current = undefined
    }
  }, [query, update])

  if (controls)
    return { state, isSupported, query }
  return state
}
