import { type NextRequest, NextResponse } from "next/server"
import { mockResponses } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, message, target } = body

    if (!session_id || !message) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Return mock response
    const response = mockResponses.sendMessage(message.content)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Message send error:", error)
    return NextResponse.json({ error: "Message send failed" }, { status: 500 })
  }
}
