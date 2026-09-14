import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * The callback signature for drop-zone events — the dropped files (or `null` for enter/leave/over
 * and when the drop carries no files) plus the underlying `DragEvent`.
 */
export type UseDropZoneCallback = (files: File[] | null, event: DragEvent) => void

export interface UseDropZoneOptions {
  /**
   * Allowed data types, if not set, all data types are allowed. Also can be a function to check the
   * data types.
   */
  dataTypes?: readonly string[] | ((types: readonly string[]) => boolean)
  /**
   * Similar to dataTypes, but exposes the DataTransferItemList for custom validation. If provided,
   * this function takes precedence over dataTypes.
   */
  checkValidity?: (items: DataTransferItemList) => boolean
  /**
   * Called when files are dropped on the zone (only when the drop is valid).
   */
  onDrop?: UseDropZoneCallback
  /**
   * Called when the drag enters the zone.
   */
  onEnter?: UseDropZoneCallback
  /**
   * Called when the drag leaves the zone.
   */
  onLeave?: UseDropZoneCallback
  /**
   * Called when the drag moves over the zone.
   */
  onOver?: UseDropZoneCallback
  /**
   * Allow multiple files to be dropped. Defaults to true.
   */
  multiple?: boolean
  /**
   * Prevent default behavior for unhandled events. Defaults to false.
   */
  preventDefaultForUnhandled?: boolean
}

export interface UseDropZoneReturn {
  /**
   * Whether a valid drag is currently over the drop zone.
   */
  isOverDropZone: boolean
  /**
   * The files of the last valid drop, or `null` when nothing has been dropped yet (mirrors
   * upstream's `files` shallowRef).
   */
  files: File[] | null
  /**
   * Subscribe to the drop event — fires with the dropped files when a valid drop happens. Returns
   * the off function that unsubscribes it.
   */
  onDrop: (fn: UseDropZoneCallback) => () => void
  /**
   * Subscribe to the drag-enter event. Returns the off function that unsubscribes it.
   */
  onDragEnter: (fn: UseDropZoneCallback) => () => void
  /**
   * Subscribe to the drag-leave event. Returns the off function that unsubscribes it.
   */
  onDragLeave: (fn: UseDropZoneCallback) => () => void
}

/**
 * Map from @vueuse/core `useDropZone`
 * (`source/vueuse/packages/core/useDropZone/`).
 *
 * @example
 * const zoneRef = useRef<HTMLDivElement>(null)
 * const { isOverDropZone } = useDropZone(zoneRef, {
 *   dataTypes: ['image/jpeg'],
 *   multiple: true,
 *   onDrop: files => console.log('dropped', files),
 * })
 *
 * useListener(onDrop, (files) => {
 *   // do something with files
 * })
 */
export function useDropZone(
  target: RefObject<HTMLElement | Document | null | undefined>,
  options: UseDropZoneOptions | UseDropZoneOptions['onDrop'] = {},
): UseDropZoneReturn {
  const [isOverDropZone, setIsOverDropZone] = useState(false)
  const [files, setFiles] = useState<File[] | null>(null)

  // Stable subscribe functions — one per event, backed by Sets in refs so the
  // subscription identities never change across renders (a reause extension
  // on top of upstream's per-option callbacks).
  const dropFns = useRef(new Set<UseDropZoneCallback>())
  const dragEnterFns = useRef(new Set<UseDropZoneCallback>())
  const dragLeaveFns = useRef(new Set<UseDropZoneCallback>())

  // Latest-options mirror: the bound handlers always read the current render's
  // options without re-subscribing on every render.
  const optionsRef = useRef(options)
  optionsRef.current = options

  const onDrop = useCallback((fn: UseDropZoneCallback) => {
    dropFns.current.add(fn)
    return () => {
      dropFns.current.delete(fn)
    }
  }, [])

  const onDragEnter = useCallback((fn: UseDropZoneCallback) => {
    dragEnterFns.current.add(fn)
    return () => {
      dragEnterFns.current.delete(fn)
    }
  }, [])

  const onDragLeave = useCallback((fn: UseDropZoneCallback) => {
    dragLeaveFns.current.add(fn)
    return () => {
      dragLeaveFns.current.delete(fn)
    }
  }, [])

  // Unmount cleanup of the event subscriptions.
  useEffect(() => {
    return () => {
      dropFns.current.clear()
      dragEnterFns.current.clear()
      dragLeaveFns.current.clear()
    }
  }, [])

  const resolvedTarget = unrefElement(target)

  useEffect(() => {
    const el = resolvedTarget
    if (!el)
      return

    // `options` may be the onDrop shorthand — normalize like upstream
    // `typeof options === 'function' ? { onDrop: options } : options`.
    const getOptions = (): UseDropZoneOptions => {
      const opts = optionsRef.current
      return typeof opts === 'function' ? { onDrop: opts } : opts
    }

    const getFiles = (event: DragEvent) => {
      const list = Array.from(event.dataTransfer?.files ?? [])
      return list.length === 0 ? null : (getOptions().multiple ?? true ? list : [list[0]])
    }

    const checkDataTypes = (types: string[]) => {
      const dataTypes = getOptions().dataTypes

      if (typeof dataTypes === 'function')
        return dataTypes(types)

      const unwrapped = dataTypes

      if (!unwrapped?.length)
        return true

      if (types.length === 0)
        return false

      return types.every(type =>
        unwrapped.some(allowedType => type.includes(allowedType)),
      )
    }

    const checkValidity = (items: DataTransferItemList) => {
      const check = getOptions().checkValidity
      if (check)
        return check(items)

      const types = Array.from(items ?? []).map(item => item.type)

      const dataTypesValid = checkDataTypes(types)
      const multipleFilesValid = (getOptions().multiple ?? true) || items.length <= 1

      return dataTypesValid && multipleFilesValid
    }

    const isSafari = () => (
      /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent)
      && !('chrome' in window)
    )

    // enter/leave counter — a drag over nested children fires multiple
    // dragenter/dragleave pairs, only the outermost leave clears the flag.
    let counter = 0

    const handleDragEvent = (event: DragEvent, eventType: 'enter' | 'over' | 'leave' | 'drop') => {
      const dataTransferItemList = event.dataTransfer?.items
      const isValid = (dataTransferItemList && checkValidity(dataTransferItemList)) ?? false

      if (getOptions().preventDefaultForUnhandled ?? false) {
        event.preventDefault()
      }

      if (!isSafari() && !isValid) {
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'none'
        }
        return
      }

      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }

      const currentFiles = getFiles(event)
      const opts = getOptions()

      switch (eventType) {
        case 'enter':
          counter += 1
          setIsOverDropZone(true)
          opts.onEnter?.(null, event)
          Array.from(dragEnterFns.current).forEach(fn => fn(null, event))
          break
        case 'over':
          opts.onOver?.(null, event)
          break
        case 'leave':
          counter -= 1
          if (counter === 0)
            setIsOverDropZone(false)
          opts.onLeave?.(null, event)
          Array.from(dragLeaveFns.current).forEach(fn => fn(null, event))
          break
        case 'drop':
          counter = 0
          setIsOverDropZone(false)
          if (isValid) {
            setFiles(currentFiles)
            opts.onDrop?.(currentFiles, event)
            Array.from(dropFns.current).forEach(fn => fn(currentFiles, event))
          }
          break
      }
    }

    const handleEnter = (event: Event) => handleDragEvent(event as DragEvent, 'enter')
    const handleOver = (event: Event) => handleDragEvent(event as DragEvent, 'over')
    const handleLeave = (event: Event) => handleDragEvent(event as DragEvent, 'leave')
    const handleDrop = (event: Event) => handleDragEvent(event as DragEvent, 'drop')

    el.addEventListener('dragenter', handleEnter)
    el.addEventListener('dragover', handleOver)
    el.addEventListener('dragleave', handleLeave)
    el.addEventListener('drop', handleDrop)

    return () => {
      el.removeEventListener('dragenter', handleEnter)
      el.removeEventListener('dragover', handleOver)
      el.removeEventListener('dragleave', handleLeave)
      el.removeEventListener('drop', handleDrop)
    }
  }, [resolvedTarget])

  return {
    isOverDropZone,
    files,
    onDrop,
    onDragEnter,
    onDragLeave,
  }
}
