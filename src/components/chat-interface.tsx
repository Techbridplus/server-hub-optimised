"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { initSocket } from "@/lib/socket-client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { PlusCircle, Settings, Menu, Send, Paperclip, Smile } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import Image from "next/image"

interface Message {
  id: string
  content: string
  createdAt: string
  userId: string
  user?: {
    id: string
    name: string
    image: string | null
  }
  attachments?: Array<{
    id: string
    url: string
  }>
  isOptimistic?: boolean
}

interface Channel {
  id: string
  name: string
  type: string
}

interface Server {
  id: string
}

interface Group {
  id: string
  name: string
  description: string
  imageUrl: string | null
  server: Server
  channels: Channel[]
  owner?: {
    name: string | null
    image: string | null
  }
}

interface ChatInterfaceProps {
  group: Group
  userId: string
  isAdmin: boolean
  channelId?: string
  serverId?: string
}

export function ChatInterface({ group, userId, isAdmin, channelId ,serverId}: ChatInterfaceProps) {
  const router = useRouter()
  const { toast } = useToast()
  const socket = initSocket(userId,serverId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()

  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({})
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get current user information
  const currentUser = {
    id: userId,
    name: session?.user?.name || "Unknown User",
    image: session?.user?.image || null,
  }

  // Fetch messages when channel changes
  useEffect(() => {
    if (!channelId) return

    // Clear messages when switching channels
    setMessages([])
    setIsLoading(true)

    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/servers/${group.server.id}/groups/${group.id}/channels/${channelId}/messages`,
        )
        if (!response.ok) throw new Error("Failed to fetch messages")

        const data = await response.json()
        // Format messages to include author information
        const formattedMessages = data.messages.map((message: Message) => ({
          ...message,
          user: {
            id: message.userId,
            name: message.user?.name ?? "Unknown User",
            image: message.user?.image ?? null,
          }
        }))
        setMessages(formattedMessages || [])
      } catch (error) {
        console.error("Error fetching messages:", error)
        toast({
          title: "Error",
          description: "Failed to load messages. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()

    // Update URL without refreshing
    router.push(`/group/${group.id}?channel=${channelId}`, { scroll: false })
  }, [channelId, group.id, group.server.id, router, toast])

  // Socket connection and event handlers
  useEffect(() => {
    if (!socket || !channelId) return

    console.log("Joining channel:", channelId)
    // Join channel room
    socket.emit("join-channel", channelId)

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      console.log("Received new message:", message)
      setMessages((prev) => {
        // Remove optimistic message if it exists
        const filteredMessages = prev.filter(m => !m.isOptimistic)
        
        // Structure the message to match the UI expectations
        const formattedMessage = {
          ...message,
          user: {
            id: message.userId,
            name: message.user?.name ?? "Unknown User",
            image: message.user?.image ?? null,
          }
        }
        
        return [...filteredMessages, formattedMessage]
      })
    }

    // Listen for typing indicators
    const handleUserTyping = (data: { userId: string; username: string }) => {
      console.log("User typing:", data)
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.username }))
    }

    const handleUserStoppedTyping = (data: { userId: string }) => {
      console.log("User stopped typing:", data)
      setTypingUsers((prev) => {
        const newState = { ...prev }
        delete newState[data.userId]
        return newState
      })
    }

    // Register event listeners
    socket.on("new-message", handleNewMessage)
    socket.on("user-typing", handleUserTyping)
    socket.on("user-stopped-typing", handleUserStoppedTyping)

    // Cleanup on unmount or channel change
    return () => {
      console.log("Leaving channel:", channelId)
      socket.emit("leave-channel", channelId)
      socket.off("new-message", handleNewMessage)
      socket.off("user-typing", handleUserTyping)
      socket.off("user-stopped-typing", handleUserStoppedTyping)
    }
  }, [socket, channelId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !channelId) return

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Emit typing start event
    socket.emit("typing-start", {
      channelId: channelId,
      user: currentUser
    })

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing-stop", {
        channelId: channelId,
        userId: currentUser.id
      })
      // Also clear local typing state
      setTypingUsers((prev) => {
        const newState = { ...prev }
        delete newState[currentUser.id]
        return newState
      })
    }, 2000) // Reduced timeout to 2 seconds
  }

  // Cleanup typing indicator when component unmounts or channel changes
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (socket && channelId) {
        socket.emit("typing-stop", {
          channelId: channelId,
          userId: currentUser.id
        })
      }
    }
  }, [socket, channelId, currentUser.id])

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !socket || !channelId) return

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    socket.emit("typing-stop", {
      channelId: channelId,
      userId: currentUser.id
    })

    try {
      // Save message to database
      const response = await fetch(
        `/api/servers/${group.server.id}/groups/${group.id}/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: messageInput,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to save message")
      }

      const savedMessage = await response.json()
      console.log("Message saved:", savedMessage)

      // Send message via socket
      socket.emit("send-message", {
        channelId: channelId,
        content: messageInput,
        user: currentUser,
        messageId: savedMessage.id
      })

      setMessageInput("")
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      {/* Mobile navigation */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute left-4 top-4 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <div className="flex h-full flex-col">
            <div className="p-4">
              <h2 className="text-lg font-semibold">{group.name}</h2>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>
            <Separator />
            <ScrollArea className="flex-1">
              <div className="p-2">
                <div className="mb-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">Text Channels</h3>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => document.getElementById("add-channel-trigger")?.click()}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={group.owner?.image || undefined} />
                    <AvatarFallback>{group.owner?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{group.owner?.name || "Unknown Owner"}</p>
                    <p className="text-xs text-muted-foreground">Owner</p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => document.getElementById("manage-members-trigger")?.click()}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {channelId ? (
          <>
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center">
                  <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    // Group consecutive messages from the same author
                    const isConsecutive = index > 0 && messages[index - 1].user?.id === message.user?.id
                    const showAvatar = !isConsecutive
                    const userName = message.user?.name ?? "Unknown User"
                    const userImage = message.user?.image ?? null
                    const userInitial = userName.charAt(0).toUpperCase()

                    return (
                      <div 
                        key={message.id} 
                        className={cn(
                          "flex items-start gap-x-3",
                          isConsecutive && "mt-1",
                          !isConsecutive && "mt-4"
                        )}
                      >
                        {showAvatar ? (
                          <Avatar className="h-8 w-8 mt-0.5">
                            <AvatarImage 
                              src={userImage || undefined} 
                              alt={userName}
                            />
                            <AvatarFallback>
                              {userInitial}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8" />
                        )}
                        <div className="flex-1">
                          {!isConsecutive && (
                            <div className="flex items-center gap-x-2">
                              <p className="text-sm font-semibold">{userName}</p>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                          <p className={cn(
                            "text-sm",
                            message.isOptimistic && "text-muted-foreground italic"
                          )}>
                            {message.content}
                          </p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachments.map((attachment) => (
                                <div key={attachment.id} className="relative h-40 w-40">
                                  <Image
                                    src={attachment.url || "/placeholder.svg"}
                                    alt="Attachment"
                                    fill
                                    className="rounded-md object-cover"
                                    sizes="160px"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Typing indicator */}
              {Object.keys(typingUsers).length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {Object.entries(typingUsers).map(([userId, username], index, array) => (
                      <span key={userId}>
                        {username}
                        {index < array.length - 2 ? ", " : index === array.length - 2 ? " and " : ""}
                      </span>
                    ))}
                  </div>
                  <span>
                    {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing
                    <span className="animate-pulse">...</span>
                  </span>
                </div>
              )}
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-x-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Textarea
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value)
                    handleTyping()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  onBlur={() => {
                    // Clear typing indicator when input loses focus
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current)
                    }
                    socket?.emit("typing-stop", {
                      channelId: channelId,
                      userId: currentUser.id
                    })
                    setTypingUsers((prev) => {
                      const newState = { ...prev }
                      delete newState[currentUser.id]
                      return newState
                    })
                  }}
                  placeholder="Type a message..."
                  className="min-h-10 flex-1 resize-none"
                />
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button onClick={sendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4">
            <h3 className="text-lg font-medium">Welcome to {group.name}</h3>
            <p className="text-muted-foreground">Select a channel to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}

