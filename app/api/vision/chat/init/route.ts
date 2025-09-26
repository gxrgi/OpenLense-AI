import { type NextRequest, NextResponse } from "next/server"
import { mockResponses } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entity_ids, goal } = body

    if (!entity_ids || !Array.isArray(entity_ids)) {
      return NextResponse.json({ error: "Entity IDs required" }, { status: 400 })
    }

    // Return mock response
    const response = mockResponses.initializeChat(entity_ids)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Chat init error:", error)
    return NextResponse.json({ error: "Chat initialization failed" }, { status: 500 })
  }
}
