import type { ConfigurableWindow } from '@reause/shared'
import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * window.showOpenFilePicker parameters
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/showOpenFilePicker#parameters
 */
export interface FileSystemAccessShowOpenFileOptions {
  multiple?: boolean
  types?: Array<{
    description?: string
    accept: Record<string, string[]>
  }>
  excludeAcceptAllOption?: boolean
}

/**
 * window.showSaveFilePicker parameters
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/showSaveFilePicker#parameters
 */
export interface FileSystemAccessShowSaveFileOptions {
  suggestedName?: string
  types?: Array<{
    description?: string
    accept: Record<string, string[]>
  }>
  excludeAcceptAllOption?: boolean
}

/**
 * FileHandle
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle
 */
export interface FileSystemFileHandle {
  getFile: () => Promise<File>
  createWritable: () => FileSystemWritableFileStream
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
interface FileSystemWritableFileStream extends WritableStream {
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
   */
  write: FileSystemWritableFileStreamWrite
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
   */
  seek: (position: number) => Promise<void>
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
   */
  truncate: (size: number) => Promise<void>
}

/**
 * FileStream.write
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
 */
interface FileSystemWritableFileStreamWrite {
  (data: string | BufferSource | Blob): Promise<void>
  (options: { type: 'write', position: number, data: string | BufferSource | Blob }): Promise<void>
  (options: { type: 'seek', position: number }): Promise<void>
  (options: { type: 'truncate', size: number }): Promise<void>
}

/**
 * FileStream.write
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
 */
export type FileSystemAccessWindow = Window & {
  showSaveFilePicker: (options: FileSystemAccessShowSaveFileOptions) => Promise<FileSystemFileHandle>
  showOpenFilePicker: (options: FileSystemAccessShowOpenFileOptions) => Promise<FileSystemFileHandle[]>
}

export type UseFileSystemAccessCommonOptions = Pick<FileSystemAccessShowOpenFileOptions, 'types' | 'excludeAcceptAllOption'>
export type UseFileSystemAccessShowSaveFileOptions = Pick<FileSystemAccessShowSaveFileOptions, 'suggestedName'>

export type UseFileSystemAccessOptions = ConfigurableWindow & UseFileSystemAccessCommonOptions & {
  /**
   * file data type
   */
  dataType?: 'Text' | 'ArrayBuffer' | 'Blob'
}

/**
 * The control surface of `useFileSystemAccess` — the third tuple member. Mirrors every upstream
 * return member except the writable `data` ref, which becomes the tuple's `data` / `setData` slots.
 */
export interface UseFileSystemAccessControls {
  /**
   * Whether the `showOpenFilePicker` / `showSaveFilePicker` API is available in the current
   * environment. `false` during render and on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * The `File` handle's current file (`.getFile()` snapshot), updated by `open`, `create`, `save`,
   * `saveAs` and `updateData`.
   */
  file: File | undefined
  /**
   * The current file's name (`file.name`).
   */
  fileName: string
  /**
   * The current file's MIME type (`file.type`).
   */
  fileMIME: string
  /**
   * The current file's size in bytes (`file.size`).
   */
  fileSize: number
  /**
   * The current file's last modification time (`file.lastModified`).
   */
  fileLastModified: number
  /**
   * Opens the native "open file" picker. Resolves with `undefined` when the API is unsupported.
   */
  open: (_options?: UseFileSystemAccessCommonOptions) => Promise<void>
  /**
   * Creates a new (empty) file via the native "save file" picker and reads it into `data`.
   */
  create: (_options?: UseFileSystemAccessShowSaveFileOptions) => Promise<void>
  /**
   * Writes the current `data` to the currently picked handle (or falls back to `saveAs` when no
   * handle is picked yet).
   */
  save: (_options?: UseFileSystemAccessShowSaveFileOptions) => Promise<void>
  /**
   * Writes the current `data` to a newly picked "save file" handle.
   */
  saveAs: (_options?: UseFileSystemAccessShowSaveFileOptions) => Promise<void>
  /**
   * Re-reads the current file from the picked handle and refreshes `file` and `data`.
   */
  updateData: () => Promise<void>
}

/**
 * React return tuple `[data, setData, controls]` — `data` is plain state (upstream's writable
 * `ShallowRef<T | undefined>`) and `setData` is the React state setter; every other upstream member
 * lives on `controls`.
 */
export type UseFileSystemAccessReturn<T = string> = readonly [
  /**
   * The content of the current file, re-read as `Text`, `ArrayBuffer` or `Blob` depending on the
   * `dataType` option. `undefined` before a file is picked (or created).
   */
  data: T | undefined,
  /**
   * Replace `data` with the React immutable-update protocol: `setData(next)` or `setData(prev =>
   * next)`. It does not touch the picked file handle — use `controls.updateData()` to re-read the
   * file.
   */
  setData: Dispatch<SetStateAction<T | undefined>>,
  controls: UseFileSystemAccessControls,
]

/**
 * Map from @vueuse/core `useFileSystemAccess`
 * (`source/vueuse/packages/core/useFileSystemAccess/`).
 *
 * @see https://vueuse.org/core/useFileSystemAccess/
 *
 * @example
 * const [data, setData, { isSupported, open, save, file }] = useFileSystemAccess({
 *   dataType: 'Text',
 *   types: [{ description: 'text', accept: { 'text/plain': ['.txt'] } }],
 * })
 */
export function useFileSystemAccess(): UseFileSystemAccessReturn<string | ArrayBuffer | Blob>
export function useFileSystemAccess(options: UseFileSystemAccessOptions & { dataType: 'Text' }): UseFileSystemAccessReturn<string>
export function useFileSystemAccess(options: UseFileSystemAccessOptions & { dataType: 'ArrayBuffer' }): UseFileSystemAccessReturn<ArrayBuffer>
export function useFileSystemAccess(options: UseFileSystemAccessOptions & { dataType: 'Blob' }): UseFileSystemAccessReturn<Blob>
export function useFileSystemAccess(options: UseFileSystemAccessOptions): UseFileSystemAccessReturn<string | ArrayBuffer | Blob>
// the implementation return is the union of every overload return: the
// `setData` slot is a `Dispatch<SetStateAction<T | undefined>>`, so no single
// `T` satisfies all overloads (TS2394 without this)
export function useFileSystemAccess(options: UseFileSystemAccessOptions = {}):
  | UseFileSystemAccessReturn<string>
  | UseFileSystemAccessReturn<ArrayBuffer>
  | UseFileSystemAccessReturn<Blob>
  | UseFileSystemAccessReturn<string | ArrayBuffer | Blob> {
  const { window: windowOption, dataType = 'Text', ...pickerOptions } = options

  // SSR-safe window resolution: `undefined` on the server and during the
  // first render (upstream `defaultWindow`).
  const resolvedWindow = windowOption === undefined
    ? (typeof window === 'undefined' ? undefined : window)
    : windowOption

  const [isSupported, setIsSupported] = useState(false)
  const [data, setData] = useState<string | ArrayBuffer | Blob | undefined>(undefined)
  const [file, setFile] = useState<File | undefined>(undefined)

  // Identity-stable mirrors of everything the stable callbacks read.
  const supportedRef = useRef(false)
  const windowRef = useRef<FileSystemAccessWindow | undefined>(undefined)
  const fileHandleRef = useRef<FileSystemFileHandle | undefined>(undefined)
  const dataRef = useRef<string | ArrayBuffer | Blob | undefined>(undefined)
  const dataTypeRef = useRef(dataType)
  const pickerOptionsRef = useRef(pickerOptions)

  dataRef.current = data
  dataTypeRef.current = dataType
  pickerOptionsRef.current = pickerOptions

  // Upstream `useSupported` + configurable `window`, resolved in a mount
  // effect so SSR and the first render never touch `window`.
  useEffect(() => {
    const win = resolvedWindow as FileSystemAccessWindow | undefined
    windowRef.current = win
    const supported = Boolean(win && 'showSaveFilePicker' in win && 'showOpenFilePicker' in win)
    supportedRef.current = supported
    setIsSupported(supported)
  }, [resolvedWindow])

  const updateFile = useCallback(async () => {
    const handle = fileHandleRef.current
    const nextFile = handle ? await handle.getFile() : undefined
    setFile(nextFile)
    return nextFile
  }, [])

  const updateData = useCallback(async () => {
    const nextFile = await updateFile()

    const type = dataTypeRef.current ?? 'Text'
    if (!nextFile) {
      setData(undefined)
      return
    }

    if (type === 'Text')
      setData(await nextFile.text())
    else if (type === 'ArrayBuffer')
      setData(await nextFile.arrayBuffer())
    else if (type === 'Blob')
      setData(nextFile)
  }, [updateFile])

  const open = useCallback(async (_options: UseFileSystemAccessCommonOptions = {}) => {
    if (!supportedRef.current)
      return
    const win = windowRef.current
    if (!win)
      return

    const [handle] = await win.showOpenFilePicker({ ...pickerOptionsRef.current, ..._options })
    fileHandleRef.current = handle
    await updateData()
  }, [updateData])

  const create = useCallback(async (_options: UseFileSystemAccessShowSaveFileOptions = {}) => {
    if (!supportedRef.current)
      return
    const win = windowRef.current
    if (!win)
      return

    fileHandleRef.current = await win.showSaveFilePicker({ ...pickerOptionsRef.current, ..._options })
    setData(undefined)
    await updateData()
  }, [updateData])

  const saveAs = useCallback(async (_options: UseFileSystemAccessShowSaveFileOptions = {}) => {
    if (!supportedRef.current)
      return
    const win = windowRef.current
    if (!win)
      return

    fileHandleRef.current = await win.showSaveFilePicker({ ...pickerOptionsRef.current, ..._options })

    const currentData = dataRef.current
    if (currentData) {
      const writableStream = await fileHandleRef.current.createWritable()
      await writableStream.write(currentData)
      await writableStream.close()
    }

    await updateFile()
  }, [updateFile])

  const save = useCallback(async (_options: UseFileSystemAccessShowSaveFileOptions = {}) => {
    if (!supportedRef.current)
      return

    if (!fileHandleRef.current)
      // save as
      return saveAs(_options)

    const currentData = dataRef.current
    if (currentData) {
      const writableStream = await fileHandleRef.current.createWritable()
      await writableStream.write(currentData)
      await writableStream.close()
    }
    await updateFile()
  }, [saveAs, updateFile])

  // Upstream `watch(() => toValue(dataType), updateData)` — only re-reads
  // when the resolved `dataType` actually changes.
  const resolvedDataType = dataType ?? 'Text'
  const prevDataTypeRef = useRef(resolvedDataType)

  useEffect(() => {
    if (prevDataTypeRef.current !== resolvedDataType) {
      prevDataTypeRef.current = resolvedDataType
      updateData()
    }
  }, [resolvedDataType, updateData])

  const fileName = file?.name ?? ''
  const fileMIME = file?.type ?? ''
  const fileSize = file?.size ?? 0
  const fileLastModified = file?.lastModified ?? 0

  // stable controls object — new identity only when its members change
  const controls = useMemo(() => ({
    isSupported,
    file,
    fileName,
    fileMIME,
    fileSize,
    fileLastModified,
    open,
    create,
    save,
    saveAs,
    updateData,
  }), [isSupported, file, fileName, fileMIME, fileSize, fileLastModified, open, create, save, saveAs, updateData])

  return [data, setData, controls]
}
