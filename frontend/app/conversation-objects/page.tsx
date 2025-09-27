"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Camera } from "lucide-react"
import Link from "next/link"
import { ImageUpload } from "@/components/image-upload"
import { CameraCapture } from "@/components/camera-capture"
import { EntitySelection } from "@/components/entity-selection"

interface Entity {
  id: string
  name: string
  category: string
  attributes: Record<string, string>
}

export default function ConversationObjectsPage() {
  const [selectedTab, setSelectedTab] = useState("upload")
  const [image, setImage] = useState<string | null>(null) // Data URL from upload/capture
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [entities, setEntities] = useState<Entity[]>([])
  const [isAnalyzed, setIsAnalyzed] = useState(false)

  const handleImageSelect = (imageUrl: string) => {
    setImage(imageUrl)
  }

  const analyzeImage = async () => {
    if (!image) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      // Convert data URL to Blob/File for upload
      const response = await fetch(image)
      const blob = await response.blob()
      const file = new File([blob], "image.png", { type: "image/png" }) // Adjust type if needed (e.g., jpeg)

      // Prepare FormData
      const formData = new FormData()
      formData.append("file", file)

      // Send to backend (replace with your backend URL, e.g., http://localhost:8000/analyze)
      const apiResponse = await fetch("http://localhost:8000/analyze", { // Adjust port if needed
        method: "POST",
        body: formData,
      })

      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status}`)
      }

      const data = await apiResponse.json()

      // Map backend response to Entity[] format
      // Backend returns: {items: [{name, description}], object_count}
      // We'll derive category as "Object" (or parse from description if possible)
      // Attributes: Use description as a single attribute, or parse it (simple split example)
      const mappedEntities: Entity[] = data.items.map((item: {name: string, description: string}, index: number) => {
        // Simple parsing: assume description like "A golden dog, breed: Golden Retriever, size: Large"
        const attributes: Record<string, string> = {}
        const descParts = item.description.split(", ")
        descParts.forEach(part => {
          const [key, value] = part.split(": ")
          if (key && value) {
            attributes[key.trim()] = value.trim()
          }
        })

        // Fallback if no attributes parsed
        if (Object.keys(attributes).length === 0) {
          attributes["description"] = item.description
        }

        // Derive category: Use first attribute or default to "Object"
        const category = attributes["type"] || attributes["breed"] ? (attributes["type"] || "Animal") : "Object"

        return {
          id: `${index + 1}`,
          name: item.name,
          category,
          attributes,
        }
      })

      setEntities(mappedEntities)
      setAnalysisProgress(100)
      setIsAnalyzed(true)
    } catch (error) {
      console.error("Analysis failed:", error)
      // Handle error (e.g., show toast or alert)
      alert("Failed to analyze image. Please try again.")
      setAnalysisProgress(0)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (isAnalyzed) {
    return <EntitySelection entities={entities} image={image!} />
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Conversation with Objects</h1>
          <p className="text-muted-foreground">Upload an image or use your camera to start conversing with objects</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Image Intake</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="camera">Live Camera</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <ImageUpload onImageSelect={handleImageSelect} />
              </TabsContent>

              <TabsContent value="camera" className="space-y-4">
                <CameraCapture onImageCapture={handleImageSelect} />
              </TabsContent>
            </Tabs>

            {/* Selected Image Preview */}
            {image && (
              <div className="space-y-4">
                <h3 className="font-medium">Selected Image</h3>
                <div className="relative max-w-md mx-auto">
                  <img
                    src={image || "/placeholder.svg"}
                    alt="Selected for analysis"
                    className="w-full h-auto rounded-lg border border-border"
                  />
                </div>
              </div>
            )}

            {/* Analysis Progress */}
            {isAnalyzing && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Analyzing image... extracting entities...</span>
                  <span className="text-sm text-muted-foreground">{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="w-full" />
              </div>
            )}

            {/* Analyze Button */}
            <Button onClick={analyzeImage} disabled={!image || isAnalyzing} className="w-full" size="lg">
              {isAnalyzing ? (
                <>Analyzing Image...</>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Analyze Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}