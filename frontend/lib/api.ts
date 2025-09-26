// API client for OpenLense backend services

interface UploadResponse {
  job_id: string
}

interface StatusResponse {
  state: "uploading" | "processing" | "ready"
  docset_id?: string
}

interface ChatResponse {
  answer: string
  citations: Array<{
    page: number
    snippet: string
    url?: string
  }>
  usage: {
    tokens: number
    cost: number
  }
}

interface AnalysisResponse {
  entities: Array<{
    name: string
    category: string
    attributes: Record<string, string>
    id: string
  }>
  analysis_id: string
}

interface ChatInitResponse {
  session_id: string
  agents: Array<{
    id: string
    name: string
  }>
}

interface ChatSendResponse {
  messages: Array<{
    speaker: string
    content: string
    ts: string
  }>
  summary?: string
}

class APIClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api"
  }

  // RAG API methods
  async uploadDocuments(files: File[]): Promise<UploadResponse> {
    const formData = new FormData()
    files.forEach((file) => formData.append("files[]", file))

    const response = await fetch(`${this.baseUrl}/rag/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Upload failed")
    }

    return response.json()
  }

  async getUploadStatus(jobId: string): Promise<StatusResponse> {
    const response = await fetch(`${this.baseUrl}/rag/status?job_id=${jobId}`)

    if (!response.ok) {
      throw new Error("Status check failed")
    }

    return response.json()
  }

  async chatWithDocuments(
    docsetId: string,
    messages: Array<{ role: string; content: string }>,
    options: { use_sources_only: boolean } = { use_sources_only: false },
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/rag/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        docset_id: docsetId,
        messages,
        options,
      }),
    })

    if (!response.ok) {
      throw new Error("Chat request failed")
    }

    return response.json()
  }

  // Vision API methods
  async analyzeImage(imageFile: File): Promise<AnalysisResponse> {
    const formData = new FormData()
    formData.append("image", imageFile)

    const response = await fetch(`${this.baseUrl}/vision/analyze`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Image analysis failed")
    }

    return response.json()
  }

  async initializeChat(entityIds: string[], goal = "general conversation"): Promise<ChatInitResponse> {
    const response = await fetch(`${this.baseUrl}/vision/chat/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_ids: entityIds,
        goal,
      }),
    })

    if (!response.ok) {
      throw new Error("Chat initialization failed")
    }

    return response.json()
  }

  async sendMessage(
    sessionId: string,
    message: { role: string; content: string },
    target = "all",
  ): Promise<ChatSendResponse> {
    const response = await fetch(`${this.baseUrl}/vision/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        target,
      }),
    })

    if (!response.ok) {
      throw new Error("Message send failed")
    }

    return response.json()
  }
}

export const apiClient = new APIClient()

// Utility functions for error handling
export const handleAPIError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return "An unexpected error occurred"
}

// Mock API responses for development
export const mockResponses = {
  uploadDocuments: (): UploadResponse => ({
    job_id: `job_${Date.now()}`,
  }),

  getUploadStatus: (stage = 0): StatusResponse => {
    const states: StatusResponse["state"][] = ["uploading", "processing", "ready"]
    return {
      state: states[Math.min(stage, 2)],
      docset_id: stage === 2 ? `docset_${Date.now()}` : undefined,
    }
  },

  chatWithDocuments: (question: string): ChatResponse => ({
    answer: `Based on the uploaded documents, here's what I found regarding "${question}". This information comes from the processed content with relevant citations.`,
    citations: [
      { page: 12, snippet: "Key finding from page 12..." },
      { page: 24, snippet: "Supporting evidence from page 24..." },
    ],
    usage: { tokens: 150, cost: 0.003 },
  }),

  analyzeImage: (): AnalysisResponse => ({
    entities: [
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
    ],
    analysis_id: `analysis_${Date.now()}`,
  }),

  initializeChat: (entityIds: string[]): ChatInitResponse => ({
    session_id: `session_${Date.now()}`,
    agents: entityIds.map((id) => ({ id, name: `Entity_${id}` })),
  }),

  sendMessage: (content: string): ChatSendResponse => ({
    messages: [
      {
        speaker: "Golden Retriever",
        content: "Woof! I love playing and being friendly with everyone!",
        ts: new Date().toISOString(),
      },
      {
        speaker: "Red Ball",
        content: "I'm here to bring joy and fun to playtime!",
        ts: new Date().toISOString(),
      },
    ],
  }),
}
