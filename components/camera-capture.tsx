"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera, Square, RotateCcw } from "lucide-react"

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment", // Use back camera on mobile
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
        context.drawImage(video, 0, 0)

        const imageUrl = canvas.toDataURL("image/jpeg", 0.8)
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
      <Card className="p-8 text-center">
        <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Camera Permission Required</h3>
        <p className="text-muted-foreground mb-4">Please allow camera access to capture images for analysis.</p>
        <Button onClick={startCamera}>Request Camera Access</Button>
      </Card>
    )
  }

  if (capturedImage) {
    return (
      <Card className="p-4">
        <div className="space-y-4">
          <img src={capturedImage || "/placeholder.svg"} alt="Captured" className="w-full h-auto rounded-lg" />
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
      {!isStreaming ? (
        <div className="text-center py-8">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Use Camera</h3>
          <p className="text-muted-foreground mb-4">Capture an image directly from your camera</p>
          <Button onClick={startCamera}>
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto rounded-lg bg-black" />
            <div className="absolute inset-0 border-2 border-primary/20 rounded-lg pointer-events-none" />
          </div>

          <div className="flex justify-center space-x-2">
            <Button onClick={captureImage} size="lg">
              <Square className="h-5 w-5 mr-2" />
              Capture
            </Button>
            <Button onClick={stopCamera} variant="outline">
              Cancel
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Position objects clearly in the frame for best analysis results
          </p>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </Card>
  )
}
