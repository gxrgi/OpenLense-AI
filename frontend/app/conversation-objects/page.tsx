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
import { VISION_API_URL } from "@/lib/config"

// This interface already matches the backend's entity structure, which is great!
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
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (imageUrl: string) => {
    setImage(imageUrl)
    setError(null); // Clear previous errors when a new image is selected
  }

  const analyzeImage = async () => {
    if (!image) return

    setIsAnalyzing(true)
    setIsAnalyzed(false)
    setError(null)
    setAnalysisProgress(0) // Start progress simulation

    try {
      // Simulate progress for better UX
      setTimeout(() => setAnalysisProgress(30), 300)
      setTimeout(() => setAnalysisProgress(60), 1000)

      // Convert data URL to Blob/File for upload
      const response = await fetch(image)
      const blob = await response.blob()
      const file = new File([blob], "image.png", { type: "image/png" })

      const formData = new FormData()
      formData.append("file", file)

      // Send to backend, or gracefully fallback for web live preview
      let data: any = null
      try {
        const apiResponse = await fetch(`${VISION_API_URL}/analyze`, {
          method: "POST",
          body: formData,
        })
        if (apiResponse.ok) {
          data = await apiResponse.json()
        }
      } catch (e) {
        console.warn("Backend not available, using Web Demo mode")
      }

      if (!data || !data.entities || !Array.isArray(data.entities)) {
        // Fallback demo entities for web deployment
        data = {
          entities: [
            {
              id: "entity-1",
              name: "Desk Lamp",
              category: "Lighting",
              attributes: { Description: "Warm adjustable brass lamp casting focused light.", State: "On" },
            },
            {
              id: "entity-2",
              name: "Coffee Mug",
              category: "Tableware",
              attributes: { Description: "Handcrafted ceramic mug filled with fresh coffee.", Level: "Half full" },
            },
            {
              id: "entity-3",
              name: "Notebook",
              category: "Stationery",
              attributes: { Description: "Leather-bound journal with brainstormed ideas.", Pages: "160" },
            },
          ]
        }
      }

      const mappedEntities: Entity[] = data.entities;

      setEntities(mappedEntities)
      setAnalysisProgress(100)
      setIsAnalyzed(true)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      console.error("Analysis failed:", errorMessage)
      setError(errorMessage); // Set error state to display to the user
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

            {image && (
              <div className="space-y-4">
                <h3 className="font-medium">Selected Image</h3>
                <div className="relative max-w-md mx-auto">
                  <img
                    src={image}
                    alt="Selected for analysis"
                    className="w-full h-auto rounded-lg border border-border"
                  />
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Analyzing image... extracting entities...</span>
                  <span className="text-sm text-muted-foreground">{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="w-full" />
              </div>
            )}

             {/* Error Message Display */}
            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/50 text-destructive rounded-lg text-center">
                    <p className="font-semibold">Analysis Failed</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

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
