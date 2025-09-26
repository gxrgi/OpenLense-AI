"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Upload, ImageIcon } from "lucide-react"

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void
}

export function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        const imageUrl = URL.createObjectURL(file)
        onImageSelect(imageUrl)
      }
    },
    [onImageSelect],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  return (
    <Card
      {...getRootProps()}
      className={`border-2 border-dashed cursor-pointer transition-colors ${
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
    >
      <input {...getInputProps()} />
      <div className="p-8 text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
          {isDragActive ? (
            <Upload className="h-6 w-6 text-primary animate-bounce" />
          ) : (
            <ImageIcon className="h-6 w-6 text-primary" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2">{isDragActive ? "Drop image here" : "Upload JPG/PNG or browse"}</h3>
        <p className="text-sm text-muted-foreground mb-4">Drag and drop an image file here, or click to select</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Supported formats: JPG, PNG</div>
          <div>Maximum file size: 10MB</div>
          <div>For best results, use clear, well-lit images</div>
        </div>
      </div>
    </Card>
  )
}
