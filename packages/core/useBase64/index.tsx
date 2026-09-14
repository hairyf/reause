import { isClient } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseBase64Options {
  /**
   * Output as Data URL format
   *
   * @default true
   */
  dataUrl?: boolean
}

export interface ToDataURLOptions extends UseBase64Options {
  /**
   * MIME type
   */
  type?: string | undefined
  /**
   * Image quality of jpeg or webp
   */
  quality?: any
}

export interface UseBase64ObjectOptions<T> extends UseBase64Options {
  serializer?: (v: T) => string
}

export interface UseBase64Return {
  /**
   * The base64-encoded transformation result. `''` until the first transformation settles.
   */
  base64: string
  /**
   * The promise of the current transformation. `undefined` until the first `execute()` run.
   */
  promise: Promise<string> | undefined
  /**
   * Manually trigger the transformation.
   */
  execute: () => Promise<string> | undefined
}

export function useBase64(target: string | undefined, options?: UseBase64Options): UseBase64Return
export function useBase64(target: Blob | undefined, options?: UseBase64Options): UseBase64Return
export function useBase64(target: ArrayBuffer | undefined, options?: UseBase64Options): UseBase64Return
export function useBase64(target: HTMLCanvasElement | undefined, options?: ToDataURLOptions): UseBase64Return
export function useBase64(target: HTMLImageElement | undefined, options?: ToDataURLOptions): UseBase64Return
export function useBase64<T extends Record<string, unknown>>(target: T, options?: UseBase64ObjectOptions<T>): UseBase64Return
export function useBase64<T extends Map<string, unknown>>(target: T, options?: UseBase64ObjectOptions<T>): UseBase64Return
export function useBase64<T extends Set<unknown>>(target: T, options?: UseBase64ObjectOptions<T>): UseBase64Return
export function useBase64<T>(target: T[], options?: UseBase64ObjectOptions<T[]>): UseBase64Return
/**
 * Reactive base64 transforming. Supports plain text, blobs/files, buffers, canvas, images, and
 * JSON-serializable objects/maps/sets.
 *
 * Map from @vueuse/core `useBase64`
 * (`source/vueuse/packages/core/useBase64/`), which returns an object
 * mirroring the upstream `{ base64, promise, execute }` members. The target is transformed to a
 * base64 data URL automatically and the result lands in `base64`; `promise` holds the promise of
 * the current transformation and `execute` re-triggers it manually.
 *
 * React divergences:
 * - the Vue `ShallowRef<string>` returns (`base64`, `promise`) become plain
 *   state values read directly — `promise` is `undefined` until the first
 *   transformation starts;
 * - upstream watches the source (`watch(target, execute, { immediate: true
 *   })` for reactive sources, a single setup call for plain values); here the
 *   source is a plain value and a `useEffect` keyed on
 *   the resolved value re-runs the transformation whenever it changes across
 *   renders;
 * - `execute` is a stable callback that always transforms the latest target
 *   and latest options. It is SSR-safe like upstream: it no-ops (resolving
 *   `undefined`) outside a browser, and the automatic first transform only
 *   runs in a mount effect, so nothing touches the DOM during render.
 *
 * @see https://vueuse.org/core/useBase64/
 *
 * @example
 * const { base64, promise, execute } = useBase64(text)
 */
export function useBase64(target: any, options?: any): UseBase64Return {
  const [base64, setBase64] = useState('')
  const [promise, setPromise] = useState<Promise<string> | undefined>()

  // latest target / options so the stable `execute` always reads the newest
  // values (upstream captures them in the setup closure)
  const targetRef = useRef(target)
  targetRef.current = target
  const optionsRef = useRef(options)
  optionsRef.current = options

  // resolved during render so the auto-transform effect re-runs whenever the
  // target value changes across renders (upstream: `watch` on the source)
  const resolvedTarget = target

  const execute = useCallback((): Promise<string> | undefined => {
    if (!isClient)
      return

    const next = new Promise<string>((resolve, reject) => {
      try {
        const _target = targetRef.current
        if (_target == null) {
          resolve('')
        }
        else if (typeof _target === 'string') {
          resolve(blobToBase64(new Blob([_target], { type: 'text/plain' })))
        }
        else if (_target instanceof Blob) {
          resolve(blobToBase64(_target))
        }
        else if (_target instanceof ArrayBuffer) {
          resolve(window.btoa(String.fromCharCode(...new Uint8Array(_target))))
        }
        else if (_target instanceof HTMLCanvasElement) {
          resolve(_target.toDataURL(optionsRef.current?.type, optionsRef.current?.quality))
        }
        else if (_target instanceof HTMLImageElement) {
          const img = _target.cloneNode(false) as HTMLImageElement
          img.crossOrigin = 'Anonymous'
          imgLoaded(img).then(() => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')!
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL(optionsRef.current?.type, optionsRef.current?.quality))
          }).catch(reject)
        }
        else if (typeof _target === 'object') {
          const _serializeFn = optionsRef.current?.serializer || getDefaultSerialization(_target)

          const serialized = _serializeFn(_target)

          resolve(blobToBase64(new Blob([serialized], { type: 'application/json' })))
        }
        else {
          reject(new Error('target is unsupported types'))
        }
      }
      catch (error) {
        reject(error)
      }
    })

    setPromise(next)
    next.then((res) => {
      setBase64(optionsRef.current?.dataUrl === false
        ? res.replace(/^data:.*?;base64,/, '')
        : res)
    })
    return next
  }, [])

  // upstream: reactive sources are watched with `immediate: true` (first run
  // included), plain values run once in setup — both become a single effect
  // keyed on the resolved target value
  useEffect(() => {
    execute()
  }, [resolvedTarget, execute])

  return { base64, promise, execute }
}

function imgLoaded(img: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    if (!img.complete) {
      img.onload = () => {
        resolve()
      }
      img.onerror = reject
    }
    else {
      resolve()
    }
  })
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = (e) => {
      resolve(e.target!.result as string)
    }
    fr.onerror = reject
    fr.readAsDataURL(blob)
  })
}

// upstream `serialization.ts` (`getDefaultSerialization`) — inlined here so
// only the `useBase64` placeholder line is uncommented in `index.ts`
const defaults = {
  array: (v: unknown[]) => JSON.stringify(v),
  object: (v: Record<string, unknown>) => JSON.stringify(v),
  set: (v: Set<unknown>) => JSON.stringify(Array.from(v)),
  map: (v: Map<string, unknown>) => JSON.stringify(Object.fromEntries(v)),
  null: () => '',
}

function getDefaultSerialization<T extends object>(target: T) {
  if (!target)
    return defaults.null

  if (target instanceof Map)
    return defaults.map
  else if (target instanceof Set)
    return defaults.set
  else if (Array.isArray(target))
    return defaults.array
  else
    return defaults.object
}
