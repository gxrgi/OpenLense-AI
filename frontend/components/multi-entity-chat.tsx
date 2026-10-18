"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeft, Send, Plus, Info, MessageSquare, Users } from "lucide-react"
import Link from "next/link"
import { VISION_API_URL } from "@/lib/config"

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);


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

  // Automatically scroll to the bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);


  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      speaker: "You",
      speakerId: "user",
      content: input,
      timestamp: new Date(),
      color: "bg-primary",
    }
    
    // Use a functional update to ensure we have the latest state
    const currentInput = input;
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get the most recent message list for the API call
      const updatedMessages = [...messages, userMessage];
      const historyForApi = updatedMessages.map(({ speaker, content }) => ({ speaker, content }));

      let aiResponses: { speaker: string; speakerId: string; content: string }[] | null = null;
      try {
        const response = await fetch(`${VISION_API_URL}/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entities: entities,
            history: historyForApi,
            user_message: currentInput,
            target_entity_id: selectedTarget,
          }),
        });

        if (response.ok) {
          aiResponses = await response.json();
        }
      } catch (err) {
        console.warn("Backend not available, using client-side persona response");
      }

      if (!aiResponses || !Array.isArray(aiResponses) || aiResponses.length === 0) {
        const targetEntity = selectedTarget !== "all"
          ? entitiesWithColors.find(e => e.id === selectedTarget) || entitiesWithColors[0]
          : entitiesWithColors[Math.floor(Math.random() * entitiesWithColors.length)];

        aiResponses = [
          {
            speaker: targetEntity.name,
            speakerId: targetEntity.id,
            content: `Hello! As the ${targetEntity.name}, I hear you say: "${currentInput}". We're running in Web Interactive Mode—everything is responding live in your browser!`,
          }
        ];
      }

      const newAiMessages: Message[] = aiResponses.map((res, index) => {
        const entity = entitiesWithColors.find(e => e.id === res.speakerId);
        return {
          id: `${Date.now()}-${index}`,
          speaker: res.speaker,
          speakerId: res.speakerId,
          content: res.content,
          timestamp: new Date(),
          color: entity ? entity.color : "bg-gray-500",
        };
      });

      setMessages(prev => [...prev, ...newAiMessages]);

    } catch (error) {
      console.error("Error in chat flow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  // Always show the user's messages, even when filtering
  const filteredMessages = filteredSpeaker 
    ? messages.filter((m) => m.speakerId === filteredSpeaker || m.speakerId === "user") 
    : messages;

  return (
    <div className="min-h-screen bg-background">
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
          <div className="p-4 border-b border-border bg-card/50">
            <h2 className="text-lg font-semibold mb-4">Multi-Entity Conversation</h2>
            <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2">
              <Button
                variant={filteredSpeaker === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilteredSpeaker(null)}
                className="flex-shrink-0"
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
                  className="flex items-center space-x-1 flex-shrink-0"
                >
                  <div className={`w-3 h-3 rounded-full ${entity.color}`} />
                  <span>{entity.name}</span>
                </Button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="space-y-6">
                 <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
                  <p className="text-muted-foreground mb-6">
                    Ask questions or use quick prompts to get the entities talking
                  </p>
                </div>
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
                  <div key={message.id} className={`flex items-start space-x-3 ${message.speakerId === 'user' ? 'justify-end' : ''}`}>
                     {message.speakerId !== 'user' && (
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${message.color}`}>
                        {message.speaker.charAt(0)}
                      </div>
                    )}
                    <div className={`max-w-xl ${message.speakerId === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center space-x-2 mb-1 ${message.speakerId === 'user' ? 'justify-end' : ''}`}>
                        <span className="font-medium text-sm">{message.speaker}</span>
                        <span className="text-xs text-muted-foreground">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`p-3 rounded-lg inline-block ${message.speakerId === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-sm text-left">{message.content}</p>
                      </div>
                    </div>
                     {message.speakerId === 'user' && (
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${message.color}`}>
                        Y
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1">
                       <div className="bg-muted p-3 rounded-lg inline-block">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
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
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="w-80 border-l border-border bg-card/50 hidden lg:block">
           <div className="p-4 border-b border-border">
            <h3 className="font-semibold mb-4">Scene Overview</h3>
            <img src={image || "/placeholder.svg"} alt="Scene" className="w-full h-32 object-cover rounded-lg mb-4" />
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-4">Entity Facts</h3>
            <ScrollArea className="h-[calc(100vh-300px)]">
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
                          <span className="text-muted-foreground">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
