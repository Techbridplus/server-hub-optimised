"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { getSocket } from "@/lib/socket-client"

interface AddChannelDialogProps {
  groupId: string
  serverId: string
}

export function AddChannelDialog({ groupId, serverId }: AddChannelDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const socket = getSocket()

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("text")
  const [isPrivate, setIsPrivate] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Channel name is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/servers/${serverId}/groups/${groupId}/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.toLowerCase().replace(/\s+/g, "-"),
          type,
          isPrivate,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create channel")
      }

      const channel = await response.json()

      toast({
        title: "Success",
        description: `Channel #${channel.name} created successfully`,
      })

      // Notify other users via socket
      if (socket) {
        socket.emit("channel-created", {
          groupId,
          channel,
        })
      }

      setIsOpen(false)
      setName("")
      setType("text")
      setIsPrivate(false)

      // Refresh the page to show the new channel
      router.refresh()
    } catch (error) {
      console.error("Error creating channel:", error)
      toast({
        title: "Error",
        description: "Failed to create channel. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button id="add-channel-trigger" variant="ghost" className="hidden">
          Add Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>
              Add a new channel to your group. Channels are where conversations happen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. general, announcements, gaming"
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label>Channel Type</Label>
              <RadioGroup value={type} onValueChange={setType} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text" disabled={isLoading} />
                  <Label htmlFor="text">Text</Label>
                </div>
                {/* <div className="flex items-center space-x-2">
                  <RadioGroupItem value="voice" id="voice" disabled={isLoading} />
                  <Label htmlFor="voice">Voice</Label>
                </div> */}
              </RadioGroup>
            </div>
            {/* <div className="flex items-center space-x-2">
              <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} disabled={isLoading} />
              <Label htmlFor="private">Private Channel</Label>
            </div> */}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

