import { useEffect, useState } from 'react'

/**
 * Map from @vueuse/core `useObjectUrl`
 * (`source/vueuse/packages/core/useObjectUrl/`). Reactive URL representing an
 * object — creates a URL for the provided `File`, `Blob`, or `MediaSource` via
 * [URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL) and
 * automatically releases it via
 * [URL.revokeObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL)
 * when the source changes or the component unmounts.
 *
 * React divergences:
 * - upstream's `shallowRef` behind a `shallowReadonly` becomes a plain
 *   `string | undefined` value — this hook is purely derived, with no
 *   setters, so passing the object directly (React state) is the recommended
 *   usage;
 * - upstream watches its `MaybeRefOrGetter` source with a Vue watcher and
 *   releases the URL on every change; here `object` is a read-only value
 *   source and takes a plain `Blob | MediaSource | null | undefined`
 *   (resolve a React ref or getter at the call site), and a `useEffect` keyed
 *   on that object creates
 *   the new URL and revokes the previous one, so
 *   the URL re-creates whenever the component re-renders with a new object;
 * - unmount revocation happens in the effect cleanup;
 * - SSR-safe: the URL is only ever created inside an effect (effects don't
 *   run on the server), and the effect bails out when `URL.createObjectURL`
 *   is unavailable.
 *
 * @see https://vueuse.org/core/useObjectUrl
 *
 * @example
 * const [file, setFile] = useState<File>()
 * const url = useObjectUrl(file)
 * // `url` is `undefined` until a file is set; a new `blob:` URL is created
 * // and the previous one revoked whenever `file` changes or the component
 * // unmounts
 */
export function useObjectUrl(object: Blob | MediaSource | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>()

  useEffect(() => {
    if (!object) {
      setUrl(undefined)
      return
    }

    if (typeof URL === 'undefined' || !URL.createObjectURL)
      return

    const next = URL.createObjectURL(object)
    setUrl(next)

    // release the URL when the object changes or the component unmounts
    // (upstream: the watcher re-releases on change, `tryOnScopeDispose` on
    // unmount)
    return () => {
      URL.revokeObjectURL(next)
    }
  }, [object])

  return url
}
