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
