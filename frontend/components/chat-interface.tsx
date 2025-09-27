"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Send, Search, Download, MessageSquare, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Message {
  role: "user" | "assistant"
  content: string
  citations?: Array<{ page: number; snippet: string }>
}

interface ChatInterfaceProps {
  files: File[]
}

export function ChatInterface({ files }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `I'm ready! Ask me anything about ${files.map(f => f.name).join(', ')}.` }
  ]);
  const [input, setInput] = useState("")
  const [useSourcesOnly, setUseSourcesOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const quickPrompts = [
    "Summarize section 2",
    "List key risks and mitigation",
    "What are the main conclusions?",
    "Extract key statistics",
  ]

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send the user's question to the /chat/ endpoint
      const response = await fetch("http://127.0.0.1:8002/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "An error occurred while fetching the response.");
      }

      const result = await response.json();
      
      // Add the AI's answer to the chat history
      // Note: Citations are not yet implemented in the backend, so we are just displaying the text answer for now.
      const assistantMessage: Message = { role: "assistant", content: result.answer };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      // Show an error message in the chat
      const errorMessage: Message = { role: "assistant", content: `Sorry, something went wrong: ${error.message}` };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/chat-document" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              New Chat
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">OL</span>
              </div>
              <span className="text-xl font-semibold text-foreground">OpenLense</span>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Document Explorer */}
        <div className="w-80 border-r border-border bg-card/50">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold mb-4">Document Explorer</h2>

            {/* File List */}
            <div className="space-y-2 mb-4">
              {files.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{file.name}</span>
                </div>
              ))}
            </div>

            {/* Mini Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search sections..." className="pl-9" />
            </div>
          </div>

          {/* Sources Panel */}
          <div className="p-4">
            <h3 className="font-medium mb-3">Sources</h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((page) => (
                  <Card key={page} className="p-3 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-10 bg-muted rounded flex items-center justify-center text-xs">{page}</div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Page {page}</p>
                        <p className="text-sm">Sample content from page {page}...</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Right Side - Chat Panel */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-card/50">
            <p className="text-sm text-muted-foreground">Ask questions; citations appear inline.</p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                  <p className="text-muted-foreground mb-6">Ask questions about your documents</p>
                </div>

                {/* Quick Prompts */}
                <div className="grid grid-cols-2 gap-2">
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
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-3xl p-4 rounded-lg ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>

                      {message.citations && (
                        <Accordion type="single" collapsible className="mt-4">
                          <AccordionItem value="sources" className="border-0">
                            <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-2">
                              Sources ({message.citations.length})
                            </AccordionTrigger>
                            <AccordionContent className="space-y-2">
                              {message.citations.map((citation, idx) => (
                                <div key={idx} className="text-xs p-2 bg-background rounded">
                                  <span className="font-medium">[p. {citation.page}]</span>
                                  <p className="mt-1">{citation.snippet}</p>
                                </div>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl p-4 rounded-lg bg-muted">
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
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-card/50">
            <div className="flex items-center space-x-2 mb-3">
              <Switch id="sources-only" checked={useSourcesOnly} onCheckedChange={setUseSourcesOnly} />
              <Label htmlFor="sources-only" className="text-sm">
                Use sources only
              </Label>
            </div>

            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your documents..."
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}