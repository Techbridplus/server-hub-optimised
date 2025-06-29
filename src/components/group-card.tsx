"use client"

import { useState, useEffect } from "react"
import { Users, MoreHorizontal, Edit, Trash, UserPlus, UserMinus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Group, GroupMember } from "../../generated/prisma"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import axios from "axios"

interface GroupCardProps {
  group: Group & {
    _count?: {
      members: number;
    };
    members?: GroupMember[];
  };
  serverId: string;
  canEdit?: boolean;
}

export function GroupCard({ group, serverId, canEdit = false }: GroupCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  // Edit form state
  const [editName, setEditName] = useState(group.name)
  const [editDescription, setEditDescription] = useState(group.description || "")
  const [isPrivate, setIsPrivate] = useState(group.isPrivate || false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  // const [isServerMember, setIsServerMember] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInvited, setIsInvited] = useState(false)

  // Check if user is already a member
  // console.log("currentUserId", currentUserId)
  const isAdminOrModerator = currentUserId && group.members && (group.members[0]?.role === "ADMIN" || group.members[0]?.role === "MODERATOR")  
  console.log("groupId", group.id)
  // Check if user is an admin or moderator
  const [isGroupMember, setIsGroupMember] = useState(false) 

  // Check if user is a member of the server
  useEffect(() => {
    const checkServerMembership = async () => {
      if (!currentUserId) {
        setIsLoading(false)
        return
      }

      try {
        const response = await axios.post(`/api/servers/${serverId}/membercheck`, {
            groupId: group.id
        })
        
        // console.log("response", response)
        
        if (response.status === 200) {
          const data = response.data
          setIsGroupMember(data.isMember)
          
          // Check if user is invited to the private group
          if (group.isPrivate && !isAdminOrModerator) {
            // You would need to implement an API endpoint to check if the user is invited
            // For now, we'll assume they're not invited unless they're a member
            setIsInvited(data.isMember || false)
          }
        } else if (response.status === 404) {
          // User is not a member of the server
          setIsGroupMember(false)
        } else {
          // Handle other response statuses
          console.error("Unexpected response status:", response.status)
          const errorData = response.data
          console.error("Error from API:", errorData)
        }
      } catch (error) {
        console.error("Error checking server membership:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkServerMembership()
  }, [currentUserId, serverId, group.id, isAdminOrModerator,group.isPrivate]) // Added isAdminOrModerator to dependencies
  console.log("isGroupMember", isGroupMember)
  // console.log("isAdminOrModerator", isAdminOrModerator)
  const handleEdit = async () => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Group name cannot be empty",
        variant: "destructive",
      })
      return
    }

    setIsEditing(true)

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          isPrivate,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update group")
      }

      const updatedGroup = await response.json()
      
      // Update local state
      group.name = updatedGroup.name
      group.description = updatedGroup.description
      group.isPrivate = updatedGroup.isPrivate

      toast({
        title: "Success",
        description: "Group updated successfully",
      })
      
      setShowEditDialog(false)
      router.refresh() // Refresh the page to show updated data
    } catch (error) {
      console.error("Error updating group:", error)
      toast({
        title: "Error",
        description: "Failed to update group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete group")
      }

      toast({
        title: "Success",
        description: "Group deleted successfully",
      })
      
      setShowDeleteDialog(false)
      router.refresh() // Refresh the page to show updated data
    } catch (error) {
      console.error("Error deleting group:", error)
      toast({
        title: "Error",
        description: "Failed to delete group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleJoin = async () => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "You need to be logged in to join a group",
        variant: "destructive",
      })
      return
    }

    // if (!isServerMember) {
    //   toast({
    //     title: "Error",
    //     description: "You need to be a member of the server to join this group",
    //     variant: "destructive",
    //   })
    //   return
    // }

    setIsJoining(true)

    try {
      const response = await fetch(`/api/groups/${group.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to join group")
      }

      const data = await response.json()
      
      toast({
        title: "Success",
        description: data.message || "You have joined the group successfully",
      })
      
      // Update local state to reflect membership
      if (group.members) {
        group.members.push({
          id: data.member.id,
          userId: currentUserId,
          groupId: group.id,
          role: "MEMBER",
          joinedAt: new Date(),
        })
      }
      
      router.refresh() // Refresh the page to show updated data
    } catch (error) {
      console.error("Error joining group:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!currentUserId) return

    setIsLeaving(true)

    try {
      const response = await fetch(`/api/groups/${group.id}/leave`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to leave group")
      }

      toast({
        title: "Success",
        description: "You have left the group successfully",
      })
      
      // Update local state to reflect leaving
      if (group.members) {
        group.members = group.members.filter(member => member.userId !== currentUserId)
      }
      
      router.refresh() // Refresh the page to show updated data
    } catch (error) {
      console.error("Error leaving group:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to leave group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-md">
              <Image src={group.imageUrl || "/placeholder.svg"} alt={group.name} fill className="object-cover" sizes="40px" />
            </div>
            <div>
              <h3 className="font-semibold">{group.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{group._count?.members || 0} members</span>
                {group.isPrivate && (
                  <span className="ml-1 text-xs text-amber-500">Private</span>
                )}
              </div>
            </div>
          </div>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground">{group.description}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {/* Only show View Group button if user is admin/moderator, a member, or invited */}
        {(isAdminOrModerator || isGroupMember || (group.isPrivate && isInvited)) ? (
          <Link href={`/group/${group.id}?serverId=${serverId}`} className="w-full">
            <Button variant="outline" className="w-full">
              View Group
            </Button>
          </Link>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            {group.isPrivate ? "Private Group" : "View Group"}
          </Button>
        )}
        
        {!isLoading && (
          <>
          {!isAdminOrModerator && isGroupMember ? (
            <Button 
                variant="destructive" 
                className="w-full transition-all duration-300 hover:bg-destructive/90" 
                onClick={handleLeave}
                disabled={isLeaving}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                {isLeaving ? "Leaving..." : "Leave Group"}
              </Button>
            ): !isAdminOrModerator && !isGroupMember ? (
              <Button 
                variant="default" 
                className="w-full transition-all duration-300 hover:bg-primary/90" 
                onClick={handleJoin}
                disabled={isJoining}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {isJoining ? "Joining..." : "Join Group"}
              </Button>
            ):<></>}
          </>
            

        )}
      </CardFooter>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Make changes to your group.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Group Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe the purpose of this group"
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="edit-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
              <Label htmlFor="edit-private">Make this group private (invitation only)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the group and remove it from the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

