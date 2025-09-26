"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Upload, FileText } from "lucide-react"

interface DocumentUploadProps {
  onFileUpload: (files: File[]) => void
}

export function DocumentUpload({ onFileUpload }: DocumentUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileUpload(acceptedFiles)
    },
    [onFileUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "text/plain": [".txt"],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
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
            <FileText className="h-6 w-6 text-primary" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2">{isDragActive ? "Drop files here" : "Drag files here or browse"}</h3>
        <p className="text-sm text-muted-foreground mb-4">Supports PDF, DOCX, PPTX, TXT files up to 20MB</p>
        <div className="text-xs text-muted-foreground">Maximum file size: 20MB per file</div>
      </div>
    </Card>
  )
}
