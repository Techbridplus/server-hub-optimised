"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Upload, X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

interface CreateGroupDialogProps {
  serverId: string
  buttonSize?: "default" | "sm"
  onGroupCreated?: () => void
}

export function CreateGroupDialog({ serverId, buttonSize = "default", onGroupCreated }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
          variant: "destructive",
        })
        return
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        })
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let imageUrl = null

      // Upload image if selected
      if (imageFile) {
        const formData = new FormData()
        formData.append("file", imageFile)
        formData.append("type", "image")
        
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json()
          throw new Error(error.error || "Failed to upload image")
        }

        const { url } = await uploadResponse.json()
        imageUrl = url
      }

      // Create group
      const response = await fetch(`/api/servers/${serverId}/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          imageUrl,
          isPrivate,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create group")
      }


      // Reset form
      setName("")
      setDescription("")
      setIsPrivate(false)
      setImagePreview(null)
      setImageFile(null)
      setOpen(false)

      // Show success message
      toast({
        title: "Success",
        description: "Group created successfully!",
      })

      // Call onGroupCreated callback if provided
      onGroupCreated?.()

      // Refresh the page to show the new group
      router.refresh()
    } catch (error) {
      console.error("Error creating group:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={buttonSize}>
          <Users className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>Create a new group for members with similar interests.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this group"
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Group Image</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
                  {imagePreview ? (
                    <div className="group relative h-full w-full">
                      <Image
                        src={imagePreview}
                        alt="Group image preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => {
                          setImagePreview(null)
                          setImageFile(null)
                        }}
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-full w-full cursor-pointer items-center justify-center">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Group Image</p>
                  <p className="text-xs text-muted-foreground">Upload an image to represent your group.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
              <Label htmlFor="private">Make this group private (invitation only)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

