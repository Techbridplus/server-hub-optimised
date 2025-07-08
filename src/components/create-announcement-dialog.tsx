"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { useSession } from "next-auth/react"
import { getSocket, initSocket, disconnectSocket } from "@/lib/socket-client"

interface CreateAnnouncementDialogProps {
  serverId: string
  buttonSize?: "default" | "sm"
  onAnnouncementCreated?: () => void
}

export function CreateAnnouncementDialog({ serverId, buttonSize = "default", onAnnouncementCreated }: CreateAnnouncementDialogProps) {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  
  // Handle socket cleanup when component unmounts or page unloads
  useEffect(() => {
    if (!session?.user?.id) return;
    
    // Initialize socket when component mounts
    initSocket(session.user.id, serverId);
    
    // Cleanup function for when component unmounts or page changes
    const handleBeforeUnload = () => {
      disconnectSocket();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disconnectSocket();
    };
  }, [session?.user?.id, serverId]);

  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

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
        isImportant: false, // Setting default value since we removed the option
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

      // Get announcement data from response
      const createdAnnouncement = await response.json()
      const announcementId = createdAnnouncement.id
      
      // Close dialog
      setOpen(false)

      // Show success message
      toast({
        title: "Announcement created",
        description: "Your announcement has been posted successfully",
      })
      
      // Create notification in database
      try {
        if (session?.user?.id) {
          
          // Fetch server members to notify them all
          const membersResponse = await fetch(`/api/servers/${serverId}/members`)
          
          if (!membersResponse.ok) {
            throw new Error("Failed to fetch server members")
          }
          
          const membersData = await membersResponse.json()
          const members = membersData.members || []
          
          if (!members.length) {
            console.warn("No server members found to notify")
          }
          
          // Prepare notification content
          const notificationHeading = `Announcement: ${title}`
          const notificationMessage = `A new announcement has been posted in your server.`
          const notificationLink = `/server/${serverId}?announcement=${announcementId}`
          
          // Batch create notifications for all members
          for (const member of members) {
            // Skip creating DB notification for the creator (they already know they created it)
            if (member.userId !== session.user.id) {
              await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  userId: member.userId,
                  heading: notificationHeading,
                  message: notificationMessage,
                  link: notificationLink
                }),
              })
            }
          }
          
          // Send real-time notification via Socket.io
          const socket = getSocket()
          
          if (socket) {
            socket.emit('server-announcement', {
              serverId: serverId,
              notification: {
                heading: notificationHeading,
                message: notificationMessage,
                read: false,
                link: notificationLink,
                createdAt: new Date()
              },
              members: members // Send the members array so server can notify each one
            })
          } else {
            console.warn("Socket not initialized, real-time notification not sent.")
          }

          // We don't disconnect here as the socket is managed by the useEffect cleanup
        }
      } catch (error) {
        // Don't block the flow if notification fails
        console.error("Failed to create notification:", error)
      }

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

            {/* Important switch removed as per requirement */}
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

