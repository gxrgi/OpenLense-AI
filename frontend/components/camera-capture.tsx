"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera, RotateCcw, X } from "lucide-react"

interface CameraCaptureProps {
  onImageCapture: (imageUrl: string) => void
}

export function CameraCapture({ onImageCapture }: CameraCaptureProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream before starting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment", // Prioritize back camera on mobile
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsStreaming(true)
        setHasPermission(true)
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      setHasPermission(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)

        const imageUrl = canvas.toDataURL("image/jpeg", 0.9) // Use higher quality jpeg
        setCapturedImage(imageUrl)
        onImageCapture(imageUrl)
        stopCamera()
      }
    }
  }, [onImageCapture, stopCamera])

  const retake = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  if (hasPermission === false) {
    return (
      <Card className="p-8 text-center bg-muted/50">
        <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Camera Permission Required</h3>
        <p className="text-muted-foreground mb-4">Please allow camera access in your browser to capture images.</p>
        <Button onClick={startCamera}>Request Camera Access</Button>
      </Card>
    )
  }

  if (capturedImage) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          <img src={capturedImage} alt="Captured" className="w-full h-auto rounded-lg" />
          <div className="flex justify-center space-x-2">
            <Button onClick={retake} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="relative aspect-video">
        {/* Video element is always rendered to ensure its ref is available */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full rounded-lg bg-black object-cover"
        />

        {/* Overlay for the "Start Camera" button, shown only when not streaming */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
            <div className="text-center p-6 bg-background/80 backdrop-blur-sm rounded-lg">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Use Live Camera</h3>
              <p className="text-muted-foreground mb-4">Capture an image from your camera.</p>
              <Button onClick={startCamera}>
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            </div>
          </div>
        )}

        {/* Border overlay when streaming */}
        {isStreaming && <div className="absolute inset-0 border-2 border-primary/20 rounded-lg pointer-events-none" />}
      </div>

      {/* Controls are shown below the video only when streaming */}
      {isStreaming && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-center items-center space-x-8">
            <div className="w-16 h-16" /> {/* Spacer */}
            <button
              onClick={captureImage}
              aria-label="Capture image"
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-gray-300 transition-transform duration-200 ease-in-out hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="w-16 h-16 rounded-full bg-white border-2 border-black" />
            </button>
            <Button onClick={stopCamera} variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-gray-500/20 hover:bg-gray-500/40">
              <X className="h-8 w-8 text-white" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Position objects clearly in the frame for best analysis results.
          </p>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </Card>
  )
}

