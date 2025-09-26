"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MessageSquare, RotateCcw } from "lucide-react"
import Link from "next/link"
import { MultiEntityChat } from "@/components/multi-entity-chat"

interface Entity {
  id: string
  name: string
  category: string
  attributes: Record<string, string>
}

interface EntitySelectionProps {
  entities: Entity[]
  image: string
}

export function EntitySelection({ entities, image }: EntitySelectionProps) {
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  const [showChat, setShowChat] = useState(false)

  const toggleEntity = (entityId: string) => {
    setSelectedEntities((prev) =>
      prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId],
    )
  }

  const startConversation = () => {
    if (selectedEntities.length > 0) {
      setShowChat(true)
    }
  }

  if (showChat) {
    const selectedEntityObjects = entities.filter((e) => selectedEntities.includes(e.id))
    return <MultiEntityChat entities={selectedEntityObjects} image={image} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/conversation-objects"
              className="flex items-center text-muted-foreground hover:text-foreground"
            >
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
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Re-analyze
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Entity Selection</h1>
          <p className="text-muted-foreground">Choose which objects you'd like to converse with</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Image Preview */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Analyzed Image</h2>
            <img
              src={image || "/placeholder.svg"}
              alt="Analyzed"
              className="w-full h-auto rounded-lg border border-border"
            />
          </div>

          {/* Entity Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Detected Entities</h2>
            <div className="grid gap-4">
              {entities.map((entity) => (
                <Card
                  key={entity.id}
                  className={`cursor-pointer transition-colors ${
                    selectedEntities.includes(entity.id) ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => toggleEntity(entity.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedEntities.includes(entity.id)}
                        onChange={() => toggleEntity(entity.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{entity.name}</h3>
                          <Badge variant="secondary">{entity.category}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(entity.attributes).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Selection Tray */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">{selectedEntities.length} selected</span>
                {selectedEntities.length > 0 && (
                  <div className="flex space-x-1">
                    {entities
                      .filter((e) => selectedEntities.includes(e.id))
                      .map((entity) => (
                        <Badge key={entity.id} variant="secondary">
                          {entity.name}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedEntities([])}
                  disabled={selectedEntities.length === 0}
                >
                  Clear All
                </Button>
                <Button onClick={startConversation} disabled={selectedEntities.length === 0}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Conversation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
