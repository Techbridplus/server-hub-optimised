"use client"

import type React from "react"

import { useState } from "react"
import { Megaphone } from "lucide-react"
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
import { useToast } from "@/components/ui/use-toast"

interface CreateAnnouncementDialogProps {
  serverId: string
  buttonSize?: "default" | "sm"
  onAnnouncementCreated?: () => void
}

export function CreateAnnouncementDialog({ serverId, buttonSize = "default", onAnnouncementCreated }: CreateAnnouncementDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isImportant, setIsImportant] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields
      if (!title || !content) {
        toast({
          title: "Missing information",
          description: "Please provide both title and content for the announcement",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Prepare announcement data
      const announcementData = {
        title,
        content,
        isImportant,
        serverId,
      }

      // Send API request
      const response = await fetch(`/api/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(announcementData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create announcement")
      }

      // Reset form
      setTitle("")
      setContent("")
      setIsImportant(false)

      // Close dialog
      setOpen(false)

      // Show success message
      toast({
        title: "Announcement created",
        description: "Your announcement has been posted successfully",
      })

      // Call the callback if provided
      if (onAnnouncementCreated) {
        onAnnouncementCreated()
      }
    } catch (error) {
      console.error("Error creating announcement:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create announcement",
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
          <Megaphone className="mr-2 h-4 w-4" />
          Create Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>Share important information with your server members.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Announcement Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your announcement"
                className="min-h-[150px]"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="important" checked={isImportant} onCheckedChange={setIsImportant} />
              <Label htmlFor="important">Mark as important</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Post Announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

