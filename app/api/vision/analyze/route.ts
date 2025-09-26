import { type NextRequest, NextResponse } from "next/server"
import { mockResponses } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get("image") as File

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Validate image type and size
    const allowedTypes = ["image/jpeg", "image/png"]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json({ error: `Unsupported image type: ${imageFile.type}` }, { status: 400 })
    }

    if (imageFile.size > maxSize) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 })
    }

    // Return mock response
    const response = mockResponses.analyzeImage()
    return NextResponse.json(response)
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Image analysis failed" }, { status: 500 })
  }
}
