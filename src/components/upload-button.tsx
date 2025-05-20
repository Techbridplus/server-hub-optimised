"use client"

import { useState } from "react"
import { Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface UploadButtonProps {
  type: "image" | "video"
  onUpload: (url: string) => void
  className?: string
  disabled?: boolean
}

export function UploadButton({ type, onUpload, className = "", disabled = false }: UploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg"]
    const allowedTypes = type === "image" ? allowedImageTypes : allowedVideoTypes

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload a valid ${type} file`,
        variant: "destructive",
      })
      return
    }

    // Validate file size (5MB for images, 50MB for videos)
    const maxSize = type === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${type === "image" ? "5MB" : "50MB"}`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      onUpload(data.url)
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={className }>
      <input
        type="file"
        accept={type === "image" ? "image/*" : "video/*"}
        onChange={handleFileSelect}
        className="hidden "
        id={`file-upload-${type}`}
        disabled={disabled}
      />
      <label
        htmlFor={`file-upload-${type}`}
        className="flex cursor-pointer flex-col items-center justify-center gap-2"
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {isUploading ? "Uploading..." :null}
        </span>
      </label>
    </div>
  )
} 