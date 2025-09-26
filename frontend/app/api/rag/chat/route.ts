import { type NextRequest, NextResponse } from "next/server"
import { mockResponses } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { docset_id, messages, options } = body

    if (!docset_id || !messages) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    const userQuestion = lastMessage?.content || "general question"

    // Return mock response
    const response = mockResponses.chatWithDocuments(userQuestion)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json({ error: "Chat request failed" }, { status: 500 })
  }
}
