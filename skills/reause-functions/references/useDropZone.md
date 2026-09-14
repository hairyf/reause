---
category: Elements
---

# useDropZone

Create a zone where files can be dropped

::: warning

Due to Safari browser limitations, file type validation is only possible during the drop event, not during drag events. As a result, the `isOverDropZone` value will always be `true` during drag operations in Safari, regardless of file type.

:::

## Usage

```tsx
import { useDropZone } from '@reause/core'
import { useRef } from 'react'

function Component() {
  const dropZoneRef = useRef<HTMLDivElement>(null)

  function onDrop(files: File[] | null) {
    // called when files are dropped on zone
  }

  const { isOverDropZone } = useDropZone(dropZoneRef, {
    onDrop,
    // specify the types of data to be received.
    dataTypes: ['image/jpeg'],
    // control multi-file drop
    multiple: true,
    // whether to prevent default behavior for unhandled events
    preventDefaultForUnhandled: false,
  })

  return (
    <div ref={dropZoneRef}>
      Drop files here
    </div>
  )
}
```

## Type Declarations

```ts
/**
 * The callback signature for drop-zone events — the dropped files (or `null`
 * for enter/leave/over and when the drop carries no files) plus the underlying
 * `DragEvent`.
 */
export type UseDropZoneCallback = (
  files: File[] | null,
  event: DragEvent,
) => void
export interface UseDropZoneOptions {
  /**
   * Allowed data types, if not set, all data types are allowed.
   * Also can be a function to check the data types.
   */
  dataTypes?: readonly string[] | ((types: readonly string[]) => boolean)
  /**
   * Similar to dataTypes, but exposes the DataTransferItemList for custom validation.
   * If provided, this function takes precedence over dataTypes.
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
   * The files of the last valid drop, or `null` when nothing has been
   * dropped yet (mirrors upstream's `files` shallowRef).
   */
  files: File[] | null
  /**
   * Subscribe to the drop event — fires with the dropped files when a valid
   * drop happens.
   */
  onDrop: (fn: UseDropZoneCallback) => {
    off: () => void
  }
  /**
   * Subscribe to the drag-enter event.
   */
  onDragEnter: (fn: UseDropZoneCallback) => {
    off: () => void
  }
  /**
   * Subscribe to the drag-leave event.
   */
  onDragLeave: (fn: UseDropZoneCallback) => {
    off: () => void
  }
}
/**
 * React port of VueUse's `useDropZone`.
 *
 * Map from @vueuse/core `useDropZone`
 * (`source/vueuse/packages/core/useDropZone/`). Create a zone where files can
 * be dropped.
 *
 * React divergences:
 * - the Vue `isOverDropZone` and `files` shallowRefs become plain state:
 *   `files` holds the files of the last valid drop (`null` until then), and
 *   dropped files also flow through the `onDrop` callback (option and/or
 *   returned subscription);
 * - upstream's per-option callbacks (`onDrop` / `onEnter` / `onLeave` /
 *   `onOver`) are kept, and the returned `onDrop` / `onDragEnter` /
 *   `onDragLeave` are stable subscribe functions with the `(fn) => { off }`
 *   shape, managed with Sets, so they are identity-stable across renders and
 *   compatible with the `useListener` protocol;
 * - the drag listeners (`dragenter` / `dragover` / `dragleave` / `drop`) are
 *   attached in a mount effect (re-bound when the resolved target changes)
 *   instead of a `useEventListener` watcher, so nothing touches the DOM or
 *   `navigator` during render (SSR-safe);
 * - the internal enter/leave counter is scoped to each binding, so drags over
 *   nested children don't flicker `isOverDropZone`.
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
export declare function useDropZone(
  target: RefObject<HTMLElement | Document | null | undefined>,
  options?: UseDropZoneOptions | UseDropZoneOptions["onDrop"],
): UseDropZoneReturn
```
