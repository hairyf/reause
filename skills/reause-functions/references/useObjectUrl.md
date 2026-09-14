---
category: Browser
---

# useObjectUrl

Reactive URL representing an object.

## Usage

```tsx
import type { ChangeEvent } from 'react'
import { useObjectUrl } from '@reause/core'
import { useState } from 'react'

const [file, setFile] = useState<File>()
const url = useObjectUrl(file)

function onFileChange(event: ChangeEvent<HTMLInputElement>) {
  const files = event.target.files
  setFile(files && files.length > 0 ? files[0] : undefined)
}
```

```tsx
return (
  <>
    <input type="file" onChange={onFileChange} />

    <a href={url}>Open file</a>
  </>
)
```

Reactive updates need no wrapper in React — pass state directly; whenever the object
changes, the previous URL is revoked and a new one is created:

```tsx
const [file, setFile] = useState<File>()
const url = useObjectUrl(file) // `undefined` until a file is set
```

## Source Forms

`object` is a read-only value source and takes a plain `Blob | MediaSource | null | undefined`
(upstream: `MaybeRefOrGetter<...>`). Resolve a React ref or state value at the call site:

```tsx
const [file, setFile] = useState<File>()

const url = useObjectUrl(file) // a new URL is created whenever `file` changes
const refUrl = useObjectUrl(fileRef.current) // resolve a React ref at the call site
```

## Type Declarations

```ts
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
export declare function useObjectUrl(
  object: Blob | MediaSource | null | undefined,
): string | undefined
```
