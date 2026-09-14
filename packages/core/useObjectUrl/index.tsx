import { useEffect, useState } from 'react'

/**
 * Map from @vueuse/core `useObjectUrl`
 * (`source/vueuse/packages/core/useObjectUrl/`).
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
