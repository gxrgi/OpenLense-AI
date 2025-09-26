"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { FileText, Upload, X, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { DocumentUpload } from "@/components/document-upload"
import { ChatInterface } from "@/components/chat-interface"

export default function ChatDocumentPage() {
  const [files, setFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessed, setIsProcessed] = useState(false)
  const [chunkSize, setChunkSize] = useState("800")
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-ada-002")
  const [autoCite, setAutoCite] = useState(true)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState("")

  const handleFileUpload = (uploadedFiles: File[]) => {
    setFiles((prev) => [...prev, ...uploadedFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const processDocuments = async () => {
    if (files.length === 0) return

    setIsProcessing(true)
    setProcessingProgress(0)

    // Simulate processing stages
    const stages = ["Uploading...", "Extracting...", "Chunking...", "Indexing..."]

    for (let i = 0; i < stages.length; i++) {
      setProcessingStage(stages[i])
      setProcessingProgress((i + 1) * 25)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    setIsProcessing(false)
    setIsProcessed(true)
  }

  if (isProcessed) {
    return <ChatInterface files={files} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">OL</span>
              </div>
              <span className="text-xl font-semibold text-foreground">OpenLense</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Chat with Document</h1>
          <p className="text-muted-foreground">Upload your documents and start asking questions</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Document Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DocumentUpload onFileUpload={handleFileUpload} />

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files</Label>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options Panel */}
            <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="chunk-size">Chunking Size</Label>
                  <Input
                    id="chunk-size"
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(e.target.value)}
                    placeholder="800"
                  />
                </div>

                <div>
                  <Label htmlFor="embedding-model">Embedding Model</Label>
                  <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                      <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                      <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-cite">Auto-cite sources</Label>
                  <Switch id="auto-cite" checked={autoCite} onCheckedChange={setAutoCite} />
                </div>
              </div>
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{processingStage}</span>
                  <span className="text-sm text-muted-foreground">{processingProgress}%</span>
                </div>
                <Progress value={processingProgress} className="w-full" />
              </div>
            )}

            {/* Process Button */}
            <Button
              onClick={processDocuments}
              disabled={files.length === 0 || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>Processing Documents...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Process Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
