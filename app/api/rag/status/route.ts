import { type NextRequest, NextResponse } from "next/server"
import { mockResponses } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("job_id")

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }

    // Simulate processing stages based on time
    const jobTimestamp = Number.parseInt(jobId.split("_")[1] || "0")
    const elapsed = Date.now() - jobTimestamp
    const stage = elapsed < 3000 ? 0 : elapsed < 6000 ? 1 : 2

    const response = mockResponses.getUploadStatus(stage)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ error: "Status check failed" }, { status: 500 })
  }
}
