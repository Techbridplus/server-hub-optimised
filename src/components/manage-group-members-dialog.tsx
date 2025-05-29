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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { getSocket } from "@/lib/socket-client"
import { MoreVertical, UserPlus, Shield, User as UserIcon, X } from "lucide-react"
import { User,MemberRole } from "../../generated/prisma"

interface GroupMemberWithUser {
  user: User
  role: MemberRole
}

interface ManageGroupMembersDialogProps {
  groupId: string
  serverId: string
  members: GroupMemberWithUser[]
  isOwner: boolean
}

export function ManageGroupMembersDialog({ groupId, serverId, members, isOwner }: ManageGroupMembersDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const socket = getSocket()

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/servers/${serverId}/groups/${groupId}/members/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to invite member")
      }

      toast({
        title: "Success",
        description: `Invitation sent to ${inviteEmail}`,
      })

      setInviteEmail("")
    } catch (error) {
      console.error("Error inviting member:", error)
      toast({
        title: "Error",
        description: "Failed to invite member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateMemberRole = async (memberId: string, role: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/groups/${groupId}/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        throw new Error("Failed to update member role")
      }

      toast({
        title: "Success",
        description: `Member role updated to ${role}`,
      })

      // Notify other users via socket
      if (socket) {
        socket.emit("member-updated", {
          groupId,
          memberId,
          role,
        })
      }

      router.refresh()
    } catch (error) {
      console.error("Error updating member role:", error)
      toast({
        title: "Error",
        description: "Failed to update member role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/groups/${groupId}/members/${memberId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to remove member")
      }

      toast({
        title: "Success",
        description: "Member removed from group",
      })

      // Notify other users via socket
      if (socket) {
        socket.emit("member-removed", {
          groupId,
          memberId,
        })
      }

      router.refresh()
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button id="manage-members-trigger" variant="ghost" className="hidden">
          Manage Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Group Members</DialogTitle>
          <DialogDescription>Invite new members or manage existing ones.</DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        <form onSubmit={inviteMember} className="flex items-center gap-x-2">
          <Input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter email to invite"
            type="email"
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={isLoading}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        </form>

        {/* Members list */}
        <ScrollArea className="h-[300px] rounded-md border p-4">
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback>{member.user.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.user.name}</p>
                    <div className="flex items-center gap-x-1">
                      {member.role === MemberRole.ADMIN ? (
                        <Shield className="h-3 w-3 text-primary" />
                      ) : member.role === MemberRole.MODERATOR ? (
                        <Shield className="h-3 w-3 text-blue-500" />
                      ) : (
                        <UserIcon className="h-3 w-3 text-muted-foreground" />
                      )}
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                </div>

                {/* Actions dropdown */}
                {(isOwner || member.role !== MemberRole.ADMIN) &&
                  member.user.id !== members.find((m) => m.role === MemberRole.ADMIN)?.user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isOwner && (
                          <>
                            <DropdownMenuItem onClick={() => updateMemberRole(member.user.id, "member")}>
                              <UserIcon className="h-4 w-4 mr-2" />
                              Set as Member
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateMemberRole(member.user.id, "moderator")}>
                              <Shield className="h-4 w-4 mr-2" />
                              Set as Moderator
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateMemberRole(member.user.id, "admin")}>
                              <Shield className="h-4 w-4 mr-2" />
                              Set as Admin
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => removeMember(member.user.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove from Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

