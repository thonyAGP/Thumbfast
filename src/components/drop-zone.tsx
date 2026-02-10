"use client"

import { useCallback, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropZoneProps {
  label: string
  multiple?: boolean
  images: string[]
  onImagesChange: (images: string[]) => void
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const DropZone = ({
  label,
  multiple = false,
  images,
  onImagesChange,
}: DropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      )
      if (imageFiles.length === 0) return

      const base64Images = await Promise.all(imageFiles.map(fileToBase64))

      if (multiple) {
        onImagesChange([...images, ...base64Images])
      } else {
        onImagesChange([base64Images[0]])
      }
    },
    [images, multiple, onImagesChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleClick = () => inputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files)
      e.target.value = ""
    }
  }

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        e.stopPropagation()
        e.preventDefault()
        processFiles(imageFiles)
      }
    },
    [processFiles]
  )

  const zoneRef = useRef<HTMLDivElement>(null)

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index))
  }

  return (
    <div
      ref={zoneRef}
      className="flex flex-col gap-2 outline-none focus-within:ring-1 focus-within:ring-ring/30 rounded-lg"
      tabIndex={0}
      onPaste={handlePaste}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>

      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border"
            >
              <img
                src={img}
                alt={`${label} ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {multiple && (
            <button
              type="button"
              onClick={handleClick}
              className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ImagePlus className="size-5" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border transition-colors hover:border-primary hover:text-primary",
            isDragOver && "border-primary bg-primary/5 text-primary"
          )}
        >
          <ImagePlus className="size-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Drop, click or paste
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
