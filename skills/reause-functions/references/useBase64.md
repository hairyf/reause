---
category: Utilities
---

# useBase64

Reactive base64 transforming. Supports plain text, buffer, files, canvas, objects, maps, sets and images.

## Usage

```tsx
import { useBase64 } from '@reause/core'

const [text, setText] = useState('')

const { base64, promise, execute } = useBase64(text)
```

### Supported Input Types

- `string` — Plain text
- `Blob` — File or blob data
- `ArrayBuffer` — Binary data
- `HTMLCanvasElement` — Canvas element
- `HTMLImageElement` — Image element
- `Object` / `Array` / `Map` / `Set` — Serialized to JSON

### Return Values

| Property  | Description                                                                            |
| --------- | -------------------------------------------------------------------------------------- |
| `base64`  | The resulting base64 string; `''` until the first transformation settles               |
| `promise` | The promise of the current transformation; `undefined` until the first `execute()` run |
| `execute` | Manually trigger the transformation; no-ops (resolving `undefined`) outside a browser  |

### Data URL Format

By default, the output is in Data URL format (e.g., `data:text/plain;base64,...`). Set `dataUrl: false` to get raw base64.

```tsx
const { base64 } = useBase64(text, { dataUrl: false })
// Returns raw base64 without the data URL prefix
```

### Canvas and Image Options

When transforming canvas or image elements, you can specify the MIME type and quality.

```tsx
const canvas = document.querySelector('canvas')

const { base64 } = useBase64(canvas, {
  type: 'image/jpeg', // MIME type
  quality: 0.8, // Image quality (0-1, for jpeg/webp)
})
```

### Custom Serializer

For objects, arrays, maps and sets, you can provide a custom serializer. Otherwise, the data will be serialized using `JSON.stringify` (maps are converted to objects, sets to arrays).

```tsx
const data = { foo: 'bar' }

const { base64 } = useBase64(data, {
  serializer: v => JSON.stringify(v, null, 2),
})
```

## Type Declarations

```ts
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
export declare function useBase64(
  target: string | undefined,
  options?: UseBase64Options,
): UseBase64Return
export declare function useBase64(
  target: Blob | undefined,
  options?: UseBase64Options,
): UseBase64Return
export declare function useBase64(
  target: ArrayBuffer | undefined,
  options?: UseBase64Options,
): UseBase64Return
export declare function useBase64(
  target: HTMLCanvasElement | undefined,
  options?: ToDataURLOptions,
): UseBase64Return
export declare function useBase64(
  target: HTMLImageElement | undefined,
  options?: ToDataURLOptions,
): UseBase64Return
export declare function useBase64<T extends Record<string, unknown>>(
  target: T,
  options?: UseBase64ObjectOptions<T>,
): UseBase64Return
export declare function useBase64<T extends Map<string, unknown>>(
  target: T,
  options?: UseBase64ObjectOptions<T>,
): UseBase64Return
export declare function useBase64<T extends Set<unknown>>(
  target: T,
  options?: UseBase64ObjectOptions<T>,
): UseBase64Return
export declare function useBase64<T>(
  target: T[],
  options?: UseBase64ObjectOptions<T[]>,
): UseBase64Return
```
