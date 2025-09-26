import { create } from "zustand"
import { persist } from "zustand/middleware"

interface Entity {
  id: string
  name: string
  category: string
  attributes: Record<string, string>
}

interface AppState {
  // Auth state
  user: { id: string; email: string } | null
  setUser: (user: { id: string; email: string } | null) => void

  // Current mode
  currentMode: "rag" | "vision" | null
  setCurrentMode: (mode: "rag" | "vision" | null) => void

  // RAG state
  docsetId: string | null
  setDocsetId: (id: string | null) => void
  uploadStatus: "idle" | "uploading" | "processing" | "ready" | "error"
  setUploadStatus: (status: "idle" | "uploading" | "processing" | "ready" | "error") => void

  // Vision state
  sessionId: string | null
  setSessionId: (id: string | null) => void
  analysisId: string | null
  setAnalysisId: (id: string | null) => void
  selectedEntities: Entity[]
  setSelectedEntities: (entities: Entity[]) => void
  cameraStreamActive: boolean
  setCameraStreamActive: (active: boolean) => void

  // Reset functions
  resetRAGState: () => void
  resetVisionState: () => void
  resetAll: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth state
      user: null,
      setUser: (user) => set({ user }),

      // Current mode
      currentMode: null,
      setCurrentMode: (mode) => set({ currentMode: mode }),

      // RAG state
      docsetId: null,
      setDocsetId: (id) => set({ docsetId: id }),
      uploadStatus: "idle",
      setUploadStatus: (status) => set({ uploadStatus: status }),

      // Vision state
      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),
      analysisId: null,
      setAnalysisId: (id) => set({ analysisId: id }),
      selectedEntities: [],
      setSelectedEntities: (entities) => set({ selectedEntities: entities }),
      cameraStreamActive: false,
      setCameraStreamActive: (active) => set({ cameraStreamActive: active }),

      // Reset functions
      resetRAGState: () =>
        set({
          docsetId: null,
          uploadStatus: "idle",
        }),
      resetVisionState: () =>
        set({
          sessionId: null,
          analysisId: null,
          selectedEntities: [],
          cameraStreamActive: false,
        }),
      resetAll: () =>
        set({
          currentMode: null,
          docsetId: null,
          uploadStatus: "idle",
          sessionId: null,
          analysisId: null,
          selectedEntities: [],
          cameraStreamActive: false,
        }),
    }),
    {
      name: "openlense-storage",
      partialize: (state) => ({
        user: state.user,
        currentMode: state.currentMode,
        docsetId: state.docsetId,
        sessionId: state.sessionId,
        analysisId: state.analysisId,
        selectedEntities: state.selectedEntities,
      }),
    },
  ),
)
