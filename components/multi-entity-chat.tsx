"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeft, Send, Plus, Info, MessageSquare, Users } from "lucide-react"
import Link from "next/link"

interface Entity {
  id: string
  name: string
  category: string
  attributes: Record<string, string>
}

interface Message {
  id: string
  speaker: string
  speakerId: string
  content: string
  timestamp: Date
  color: string
}

interface MultiEntityChatProps {
  entities: Entity[]
  image: string
}

const entityColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]

export function MultiEntityChat({ entities, image }: MultiEntityChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedTarget, setSelectedTarget] = useState("all")
  const [filteredSpeaker, setFilteredSpeaker] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const entitiesWithColors = entities.map((entity, index) => ({
    ...entity,
    color: entityColors[index % entityColors.length],
  }))

  const quickPrompts = [
    "Introduce yourselves",
    "Debate your differences",
    "Explain the scene to a child",
    "What do you think of each other?",
  ]

  const handleSend = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      speaker: "You",
      speakerId: "user",
      content: input,
      timestamp: new Date(),
      color: "bg-primary",
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI responses
    setTimeout(() => {
      const responses: Message[] = []

      if (selectedTarget === "all") {
        // All entities respond
        entitiesWithColors.forEach((entity, index) => {
          responses.push({
            id: `${Date.now()}-${index}`,
            speaker: entity.name,
            speakerId: entity.id,
            content: `Hi! I'm ${entity.name}, a ${entity.category.toLowerCase()}. ${generateEntityResponse(entity, userMessage.content)}`,
            timestamp: new Date(Date.now() + index * 1000),
            color: entity.color,
          })
        })
      } else {
        // Single entity responds
        const targetEntity = entitiesWithColors.find((e) => e.id === selectedTarget)
        if (targetEntity) {
          responses.push({
            id: Date.now().toString(),
            speaker: targetEntity.name,
            speakerId: targetEntity.id,
            content: generateEntityResponse(targetEntity, userMessage.content),
            timestamp: new Date(),
            color: targetEntity.color,
          })
        }
      }

      setMessages((prev) => [...prev, ...responses])
      setIsLoading(false)
    }, 2000)
  }

  const generateEntityResponse = (entity: Entity, userInput: string) => {
    const responses = {
      Animal: [
        "Woof! I love playing and being friendly with everyone!",
        "I'm always excited to meet new friends and explore!",
        "My favorite activities are playing fetch and running around!",
      ],
      Toy: [
        "I'm here to bring joy and fun to playtime!",
        "I love being part of games and adventures!",
        "I'm designed to be durable and entertaining!",
      ],
      Furniture: [
        "I provide comfort and support for everyone who needs rest.",
        "I've been here watching over this space for a while.",
        "I'm built to last and serve the community well.",
      ],
    }

    const categoryResponses = responses[entity.category as keyof typeof responses] || [
      "I'm unique in my own way and happy to be here!",
      "Each of us brings something special to this scene.",
      "I have my own perspective on what's happening here.",
    ]

    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)]
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const filteredMessages = filteredSpeaker ? messages.filter((m) => m.speakerId === filteredSpeaker) : messages

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
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-card/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Multi-Entity Conversation</h2>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entity
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Add More Entities</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      Re-analyze the image to detect additional entities or upload a new image.
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Entity Avatar Chips */}
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant={filteredSpeaker === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilteredSpeaker(null)}
              >
                <Users className="h-4 w-4 mr-1" />
                All
              </Button>
              {entitiesWithColors.map((entity) => (
                <Button
                  key={entity.id}
                  variant={filteredSpeaker === entity.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilteredSpeaker(entity.id)}
                  className="flex items-center space-x-1"
                >
                  <div className={`w-3 h-3 rounded-full ${entity.color}`} />
                  <span>{entity.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
                  <p className="text-muted-foreground mb-6">
                    Ask questions or use quick prompts to get the entities talking
                  </p>
                </div>

                {/* Quick Prompts */}
                <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPrompt(prompt)}
                      className="text-left justify-start h-auto p-3"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${message.color}`}
                    >
                      {message.speaker === "You" ? "Y" : message.speaker.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{message.speaker}</span>
                        <span className="text-xs text-muted-foreground">{message.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-card/50">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-sm text-muted-foreground">Ask:</span>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entitiesWithColors.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-80 border-l border-border bg-card/50">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold mb-4">Scene Overview</h3>
            <img src={image || "/placeholder.svg"} alt="Scene" className="w-full h-32 object-cover rounded-lg mb-4" />
          </div>

          <div className="p-4">
            <h3 className="font-semibold mb-4">Entity Facts</h3>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {entitiesWithColors.map((entity) => (
                  <Card key={entity.id} className="p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${entity.color}`} />
                      <span className="font-medium text-sm">{entity.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {entity.category}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(entity.attributes).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Safety Notice</p>
                  <p>No identification of real people.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
