"use client"

import { useState, useEffect } from "react"
import { Users, Search, Shield, UserMinus, MoreHorizontal, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ServerMember, User } from "../../generated/prisma"
import { useToast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import { ChatDialog } from "@/components/chat-dialog"
import { formatDistanceToNow } from "date-fns"
import { initSocket, disconnectSocket } from "@/lib/socket-client"

interface MembersDialogProps {
  serverId: string;
}

interface MemberWithUser extends ServerMember {
  user: User;
  status: "online" | "offline" | "idle" | "dnd";
  lastSeen?: Date;
}

export function MembersDialog({serverId }: MembersDialogProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<MemberWithUser | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { toast } = useToast()
  const { data: session } = useSession()
  
  const currentUser = session?.user
  
  // Fetch members data
  useEffect(() => {
    if (open) {
      fetchMembers()
    }
  }, [open, serverId])
  
  // Initialize socket connection
  useEffect(() => {
    if (open && currentUser) {
      const socket = initSocket(currentUser.id, serverId)
      
      // Listen for member status updates
      socket.on("memberStatusUpdate", (data: { userId: string, status: string }) => {
        setMembers(prevMembers => 
          prevMembers.map(member => 
            member.userId === data.userId 
              ? { ...member, status: data.status as "online" | "offline" | "idle" | "dnd" } 
              : member
          )
        )
      })
      
      // Listen for new members joining
      socket.on("memberJoined", (newMember: MemberWithUser) => {
        setMembers(prevMembers => [...prevMembers, newMember])
      })
      
      // Listen for members leaving
      socket.on("memberLeft", (userId: string) => {
        setMembers(prevMembers => prevMembers.filter(member => member.userId !== userId))
      })
      
      return () => {
        disconnectSocket()
      }
    }
  }, [open, serverId, currentUser])
  
  const fetchMembers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/servers/${serverId}/members`)
      if (!response.ok) throw new Error("Failed to fetch members")
      
      const data = await response.json()
      setMembers(data)
    } catch (error) {
      console.error("Error fetching members:", error)
      toast({
        title: "Error",
        description: "Failed to load server members",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMembers = members.filter((member) => 
    (member.user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  )

  const handlePromoteToModerator = async (memberId: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/members/${memberId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: "MODERATOR" })
      })
      
      if (!response.ok) throw new Error("Failed to promote member")
      
      // Update local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, role: "MODERATOR" } 
            : member
        )
      )
      
      toast({
        title: "Success",
        description: "Member promoted to moderator"
      })
      
      // Emit socket event
      initSocket()?.emit("memberRoleUpdate", { 
        serverId, 
        memberId, 
        role: "MODERATOR" 
      })
    } catch (error) {
      console.error("Error promoting member:", error)
      toast({
        title: "Error",
        description: "Failed to promote member",
        variant: "destructive"
      })
    }
  }

  const handleRemoveModerator = async (memberId: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/members/${memberId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: "MEMBER" })
      })
      
      if (!response.ok) throw new Error("Failed to remove moderator status")
      
      // Update local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, role: "MEMBER" } 
            : member
        )
      )
      
      toast({
        title: "Success",
        description: "Moderator status removed"
      })
      
      // Emit socket event
      initSocket()?.emit("memberRoleUpdate", { 
        serverId, 
        memberId, 
        role: "MEMBER" 
      })
    } catch (error) {
      console.error("Error removing moderator status:", error)
      toast({
        title: "Error",
        description: "Failed to remove moderator status",
        variant: "destructive"
      })
    }
  }

  const handleKickMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/members/${memberId}`, {
        method: "DELETE"
      })
      
      if (!response.ok) throw new Error("Failed to kick member")
      
      // Update local state
      setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId))
      
      toast({
        title: "Success",
        description: "Member kicked from server"
      })
      
      // Emit socket event
      initSocket()?.emit("memberKicked", { 
        serverId, 
        memberId 
      })
    } catch (error) {
      console.error("Error kicking member:", error)
      toast({
        title: "Error",
        description: "Failed to kick member",
        variant: "destructive"
      })
    }
  }
  
  const openChat = (member: MemberWithUser) => {
    setSelectedMember(member)
    setIsChatOpen(true)
  }
  

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Members
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Server Members</DialogTitle>
            <DialogDescription>
              Manage server members and their roles
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={member.user.image || undefined} />
                          <AvatarFallback>
                            {member.user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                            member.status === "online"
                              ? "bg-green-500"
                              : member.status === "idle"
                              ? "bg-yellow-500"
                              : member.status === "dnd"
                              ? "bg-red-500"
                              : "bg-gray-500"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{member.user.name || "Unknown User"}</span>
                          {member.role === "ADMIN" && (
                            <Badge variant="default">Admin</Badge>
                          )}
                          {member.role === "MODERATOR" && (
                            <Badge variant="secondary">Moderator</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.status === "offline" && member.lastSeen
                            ? `Last seen ${formatDistanceToNow(new Date(member.lastSeen), {
                                addSuffix: true
                              })}`
                            : member.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openChat(member)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </DropdownMenuItem>
                          {member.role !== "ADMIN" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handlePromoteToModerator(member.id)}
                                disabled={member.role === "MODERATOR"}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Promote to Moderator
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRemoveModerator(member.id)}
                                disabled={member.role !== "MODERATOR"}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove Moderator
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleKickMember(member.id)}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Kick Member
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selectedMember && (
        <>
          <ChatDialog
            isOpen={isChatOpen}
            onClose={() => {
              setIsChatOpen(false)
              setSelectedMember(null)
            }}
            otherUser={selectedMember.user}
            currentUserId={currentUser?.id || ""}
          />
        </>
      )}
    </>
  )
}

