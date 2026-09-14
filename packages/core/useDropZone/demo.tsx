import { useDropZone } from '@reause/core'
import { useRef, useState } from 'react'

interface FileData {
  name: string
  size: number
  type: string
  lastModified: number
}

function BooleanDisplay({ value }: { value: boolean }) {
  return (
    <strong>
      {value ? 'true' : 'false'}
    </strong>
  )
}

export default function UseDropZoneDemo() {
  // DOM targets are React refs (a plain element is no longer accepted)
  const dropZoneEl = useRef<HTMLDivElement | null>(null)
  const imageDropZoneEl = useRef<HTMLDivElement | null>(null)

  const [filesData, setFilesData] = useState<FileData[]>([])
  const [imageFilesData, setImageFilesData] = useState<FileData[]>([])

  function onDrop(files: File[] | null) {
    setFilesData(files
      ? files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        }))
      : [])
  }

  function onImageDrop(files: File[] | null) {
    setImageFilesData(files
      ? files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        }))
      : [])
  }

  const { isOverDropZone } = useDropZone(dropZoneEl, onDrop)

  const { isOverDropZone: isOverImageDropZone } = useDropZone(imageDropZoneEl, {
    dataTypes: ['image/png'],
    onDrop: onImageDrop,
  })

  return (
    <div>
      <p>Drop files from your computer on to drop zones</p>

      <div className="flex gap-2">
        <div
          ref={dropZoneEl}
          className="flex flex-col w-full min-h-200px h-auto bg-gray-400/10 justify-center items-center mt-6 rounded"
        >
          <div className="font-bold mb-2">
            General DropZone
          </div>
          <div>
            isOverDropZone:
            {' '}
            <BooleanDisplay value={isOverDropZone} />
          </div>
          <div className="flex flex-wrap justify-center items-center">
            {filesData.map(file => (
              <div key={file.name} className="w-200px bg-black-200/10 ma-2 pa-6">
                <p>
                  Name:
                  {' '}
                  {file.name}
                </p>
                <p>
                  Size:
                  {' '}
                  {file.size}
                </p>
                <p>
                  Type:
                  {' '}
                  {file.type}
                </p>
                <p>
                  Last modified:
                  {' '}
                  {file.lastModified}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div
          ref={imageDropZoneEl}
          className="flex flex-col w-full min-h-200px h-auto bg-gray-400/10 justify-center items-center mt-6 rounded"
        >
          <div className="font-bold mb-2">
            Image DropZone
          </div>
          <div>
            isOverDropZone:
            {' '}
            <BooleanDisplay value={isOverImageDropZone} />
          </div>
          <div className="flex flex-wrap justify-center items-center">
            {imageFilesData.map(file => (
              <div key={file.name} className="w-200px bg-black-200/10 ma-2 pa-6">
                <p>
                  Name:
                  {' '}
                  {file.name}
                </p>
                <p>
                  Size:
                  {' '}
                  {file.size}
                </p>
                <p>
                  Type:
                  {' '}
                  {file.type}
                </p>
                <p>
                  Last modified:
                  {' '}
                  {file.lastModified}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
