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
  const [image, setImage] = useState<string | null>(null)
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

    // Simulate analysis progress
    const stages = ["Uploading...", "Analyzing image...", "Extracting entities..."]

    for (let i = 0; i < stages.length; i++) {
      setAnalysisProgress((i + 1) * 33)
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    // Mock entities
    const mockEntities: Entity[] = [
      {
        id: "1",
        name: "Golden Retriever",
        category: "Animal",
        attributes: { breed: "Golden Retriever", color: "Golden", size: "Large" },
      },
      {
        id: "2",
        name: "Red Ball",
        category: "Toy",
        attributes: { color: "Red", material: "Rubber", shape: "Sphere" },
      },
      {
        id: "3",
        name: "Park Bench",
        category: "Furniture",
        attributes: { material: "Wood", color: "Brown", type: "Outdoor" },
      },
    ]

    setEntities(mockEntities)
    setIsAnalyzing(false)
    setIsAnalyzed(true)
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
