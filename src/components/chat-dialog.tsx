import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import axios from "axios"
import { format } from "date-fns"
import { getSocket } from "@/lib/socket-client"

interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
}

interface ChatDialogProps {
  isOpen: boolean
  onClose: () => void
  otherUser: {
    id: string
    name: string | null
    image: string | null
  }
  currentUserId: string
}

export function ChatDialog({
  isOpen,
  onClose,
  otherUser,
  currentUserId
}: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`/api/chat/history?userId=${otherUser.id}`)
      setMessages(response.data)
      scrollToBottom()
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [otherUser.id, toast, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      fetchMessages()
    }
  }, [isOpen, otherUser.id, fetchMessages])

  useEffect(() => {
    const socket = getSocket()
    
    socket.on("directMessage", (message: Message) => {
      if (
        (message.senderId === otherUser.id && message.receiverId === currentUserId) ||
        (message.senderId === currentUserId && message.receiverId === otherUser.id)
      ) {
        setMessages((prev) => [...prev, message])
        setTimeout(scrollToBottom, 100)
      }
    })

    return () => {
      socket.off("directMessage")
    }
  }, [otherUser.id, currentUserId, scrollToBottom])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const response = await axios.post("/api/chat/history", {
        receiverId: otherUser.id,
        content: newMessage.trim()
      })

      const socket = getSocket()
      socket.emit("directMessage", response.data)
      setMessages((prev) => [...prev, response.data])
      setNewMessage("")
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUser.image || undefined} />
              <AvatarFallback>
                {otherUser.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span>{otherUser.name || "User"}</span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === currentUserId ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.senderId === currentUserId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {format(new Date(message.createdAt), "HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !newMessage.trim()}>
              Send
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 