import type { RefObject } from 'react'
import { hasOwn } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

export interface UseFileDialogOptions {
  /**
   * A custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document | null
  /**
   * @default true
   */
  multiple?: boolean
  /**
   * @default '*'
   */
  accept?: string
  /**
   * Select the input source for the capture file.
   * @see [HTMLInputElement Capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture)
   */
  capture?: string
  /**
   * Reset when open file dialog.
   * @default false
   */
  reset?: boolean
  /**
   * Select directories instead of files.
   * @see [HTMLInputElement webkitdirectory](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory)
   * @default false
   */
  directory?: boolean

  /**
   * Initial files to set.
   * @default null
   */
  initialFiles?: Array<File> | FileList

  /**
   * The input element to use for file dialog.
   * @default document.createElement('input')
   */
  input?: RefObject<HTMLInputElement | null>
}

const DEFAULT_OPTIONS = {
  multiple: true,
  accept: '*',
  reset: false,
  directory: false,
} satisfies UseFileDialogOptions

export interface UseFileDialogReturn {
  files: FileList | null
  open: (localOptions?: Partial<UseFileDialogOptions>) => void
  reset: () => void
  onChange: (fn: (files: FileList | null) => void) => { off: () => void }
  onCancel: (fn: () => void) => { off: () => void }
}

function prepareInitialFiles(files: UseFileDialogOptions['initialFiles']): FileList | null {
  if (!files)
    return null

  if (files instanceof FileList)
    return files

  const dt = new DataTransfer()
  for (const file of files) {
    dt.items.add(file)
  }

  return dt.files
}

/**
 * Map from @vueuse/core `useFileDialog`
 * (`source/vueuse/packages/core/useFileDialog/`).
 *
 * @example
 * const { files, open, reset, onChange, onCancel } = useFileDialog({ accept: 'image/*' })
 *
 * useListener(onChange, (files) => {
 *   // do something with files
 * })
 *
 * useListener(onCancel, () => {
 *   // do something on cancel
 * })
 */
export function useFileDialog(options: UseFileDialogOptions = {}): UseFileDialogReturn {
  // Latest-options mirror: `open()` stays identity-stable while always using
  // the current render's options.
  const optionsRef = useRef(options)
  optionsRef.current = options

  const [files, setFiles] = useState<FileList | null>(() => prepareInitialFiles(options.initialFiles))

  // Event hooks: upstream `createEventHook()` — one stable subscribe
  // function per event, returning an `off` handle to unsubscribe. The sets
  // are stored in refs so the subscribe functions stay identity-stable.
  const changeFns = useRef(new Set<(files: FileList | null) => void>())
  const cancelFns = useRef(new Set<() => void>())

  const onChange = useCallback((fn: (files: FileList | null) => void) => {
    changeFns.current.add(fn)
    return {
      off: () => {
        changeFns.current.delete(fn)
      },
    }
  }, [])

  const onCancel = useCallback((fn: () => void) => {
    cancelFns.current.add(fn)
    return {
      off: () => {
        cancelFns.current.delete(fn)
      },
    }
  }, [])

  const changeTrigger = useCallback((nextFiles: FileList | null) => {
    Array.from(changeFns.current).forEach(fn => fn(nextFiles))
  }, [])

  const cancelTrigger = useCallback(() => {
    Array.from(cancelFns.current).forEach(fn => fn())
  }, [])

  const resolvedInput = options.input ? unrefElement(options.input) : undefined
  const customDocument = options.document ?? (typeof document === 'undefined' ? null : document)

  // Resolve the input element (custom `input` option or a newly created one)
  // and wire the change / cancel events — upstream's `inputRef` computed,
  // moved into an effect so nothing touches the DOM during render.
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const input = resolvedInput ?? (customDocument ? customDocument.createElement('input') : null)
    if (!input)
      return

    inputRef.current = input
    input.type = 'file'

    input.onchange = (event: Event) => {
      const result = event.target as HTMLInputElement
      setFiles(result.files)
      changeTrigger(result.files)
    }

    input.oncancel = () => {
      cancelTrigger()
    }

    return () => {
      input.onchange = null
      input.oncancel = null
      if (inputRef.current === input)
        inputRef.current = null
    }
  }, [resolvedInput, customDocument, changeTrigger, cancelTrigger, setFiles])

  // Unmount cleanup of the event subscriptions (upstream: `tryOnScopeDispose`
  // inside createEventHook's `on`).
  useEffect(() => {
    return () => {
      changeFns.current.clear()
      cancelFns.current.clear()
    }
  }, [])

  const applyOptions = useCallback((opts: UseFileDialogOptions) => {
    const el = inputRef.current
    if (!el)
      return
    el.multiple = opts.multiple!
    el.accept = opts.accept!
    // webkitdirectory key is not stabled, maybe replaced in the future.
    el.webkitdirectory = opts.directory!
    if (hasOwn(opts, 'capture'))
      el.capture = opts.capture!
  }, [])

  // Plain option values so the effect re-applies when one changes across a
  // re-render (upstream: `watchEffect`).
  const multiple = options.multiple
  const accept = options.accept
  const capture = options.capture
  const directory = options.directory

  // React analog of upstream's `watchEffect(() => applyOptions(options))` —
  // reuse `applyOptions` instead of duplicating its assignments. The plain
  // option values are deps so a changed value across a re-render re-applies the
  // attributes, and `resolvedInput` is a dep so swapping the input ref applies
  // the attributes to the newly wired element immediately (upstream's
  // `watchEffect` reapplies without waiting for the next `open()`).
  useEffect(() => {
    applyOptions(options)
  }, [multiple, accept, capture, directory, options, resolvedInput, applyOptions])

  const reset = useCallback(() => {
    setFiles(null)
    const input = inputRef.current
    if (input && input.value) {
      input.value = ''
      changeTrigger(null)
    }
  }, [changeTrigger])

  const open = useCallback((localOptions?: Partial<UseFileDialogOptions>) => {
    const el = inputRef.current
    if (!el)
      return
    const mergedOptions: UseFileDialogOptions = {
      ...DEFAULT_OPTIONS,
      ...optionsRef.current,
      ...localOptions,
    }
    applyOptions(mergedOptions)
    if (mergedOptions.reset)
      reset()
    el.click()
  }, [applyOptions, reset])

  return {
    files,
    open,
    reset,
    onChange,
    onCancel,
  }
}
