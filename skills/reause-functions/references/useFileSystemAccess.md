---
category: Browser
---

# useFileSystemAccess

Create and read and write local files with [FileSystemAccessAPI](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

## Usage

```tsx
import { useFileSystemAccess } from '@reause/core'

const [data, setData, {
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
}] = useFileSystemAccess()

function handleOpen() {
  await open() // native "open file" picker → reads the file into `data`
}

function handleSave() {
  await save() // writes `data` to the current handle
}
```

## Type Declarations

```ts
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
  (options: {
    type: "write"
    position: number
    data: string | BufferSource | Blob
  }): Promise<void>
  (options: { type: "seek"; position: number }): Promise<void>
  (options: { type: "truncate"; size: number }): Promise<void>
}
/**
 * FileStream.write
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
 */
export type FileSystemAccessWindow = Window & {
  showSaveFilePicker: (
    options: FileSystemAccessShowSaveFileOptions,
  ) => Promise<FileSystemFileHandle>
  showOpenFilePicker: (
    options: FileSystemAccessShowOpenFileOptions,
  ) => Promise<FileSystemFileHandle[]>
}
export type UseFileSystemAccessCommonOptions = Pick<
  FileSystemAccessShowOpenFileOptions,
  "types" | "excludeAcceptAllOption"
>
export type UseFileSystemAccessShowSaveFileOptions = Pick<
  FileSystemAccessShowSaveFileOptions,
  "suggestedName"
>
export type UseFileSystemAccessOptions = ConfigurableWindow &
  UseFileSystemAccessCommonOptions & {
    /**
     * file data type
     */
    dataType?: "Text" | "ArrayBuffer" | "Blob"
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
export declare function useFileSystemAccess(): UseFileSystemAccessReturn<
  string | ArrayBuffer | Blob
>
export declare function useFileSystemAccess(
  options: UseFileSystemAccessOptions & {
    dataType: "Text"
  },
): UseFileSystemAccessReturn<string>
export declare function useFileSystemAccess(
  options: UseFileSystemAccessOptions & {
    dataType: "ArrayBuffer"
  },
): UseFileSystemAccessReturn<ArrayBuffer>
export declare function useFileSystemAccess(
  options: UseFileSystemAccessOptions & {
    dataType: "Blob"
  },
): UseFileSystemAccessReturn<Blob>
export declare function useFileSystemAccess(
  options: UseFileSystemAccessOptions,
): UseFileSystemAccessReturn<string | ArrayBuffer | Blob>
```
