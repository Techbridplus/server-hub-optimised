"use client"

import { useState, useEffect, useCallback } from "react"
import { Heart, MoreHorizontal, Edit, Trash, MessageCircle, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { formatDistanceToNow } from "date-fns"
import { useSession } from "next-auth/react"
import { Announcement, Comment } from "../../generated/prisma"
import { Skeleton } from "@/components/ui/skeleton"

interface AnnouncementWithAuthor extends Announcement {
  author: {
    id: string
    name: string | null // Updated to allow null
    image: string | null // Updated to allow null
  }
  _count: {
    likes: number
    comments: number
  }
}

interface CommentWithUser extends Comment {
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface AnnouncementCardProps {
  announcement: AnnouncementWithAuthor
  // onAnnouncementUpdated?: (updatedAnnouncement: AnnouncementWithAuthor) => void
  // onAnnouncementDeleted?: (announcementId: string) => void
}

export function AnnouncementCard({ 
  announcement
}: AnnouncementCardProps) {
  const { data: session } = useSession()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLiking, setIsLiking] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)

  // Edit form state
  const [editTitle, setEditTitle] = useState(announcement.title)
  const [editContent, setEditContent] = useState(announcement.content)
  const [editIsImportant, setEditIsImportant] = useState(announcement.isImportant)
  const [isEditing, setIsEditing] = useState(false)

  const fetchLikes = useCallback(async () => {
    if (!announcement.id) return
    
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/likes?userId=${session?.user?.id}`)
      if (!response.ok) throw new Error('Failed to fetch likes')
      const data = await response.json()
      setLiked(data.userLiked)
      setLikeCount(data.count)
    } catch (error) {
      console.error("Error fetching likes:", error)
    }
  }, [announcement.id, session?.user?.id])

  const fetchComments = useCallback(async () => {
    if (!announcement.id) return
    
    setIsLoadingComments(true)
    
    try {
      // Add a delay to show the skeleton loading state
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const response = await fetch(`/api/announcements/${announcement.id}/comments`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error("Error fetching comments:", error)
      setComments([])
    } finally {
      setIsLoadingComments(false)
    }
  }, [announcement.id])

  useEffect(() => {
    if (announcement.id) {
      fetchLikes()
      fetchComments()
    }
  }, [announcement.id, fetchLikes, fetchComments])

  const handleLike = async () => {
    if (!session?.user || !announcement.id) return

    setIsLiking(true)
    const previousLiked = liked
    const previousCount = likeCount
    
    setLiked(!previousLiked)
    setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1)

    try {
      const response = await fetch(`/api/announcements/${announcement.id}/likes`, {
        method: "POST",
      })
      
      if (!response.ok) {
        setLiked(previousLiked)
        setLikeCount(previousCount)
        throw new Error('Failed to toggle like')
      }
      
      const data = await response.json()
      if (data.liked !== !previousLiked) {
        setLiked(data.liked)
        setLikeCount(data.count)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      setLiked(previousLiked)
      setLikeCount(previousCount)
    } finally {
      setIsLiking(false)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user || !newComment.trim() || !announcement.id) return

    setIsSubmittingComment(true)
    const commentText = newComment
    setNewComment("")
    
    const tempComment: CommentWithUser = {
      id: `temp-${Date.now()}`,
      content: commentText,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: session.user.id,
      announcementId: announcement.id,
      user: {
        id: session.user.id,
        name: session.user.name || null,
        image: session.user.image || null,
      }
    }
    
    setComments([tempComment, ...comments])

    try {
      const response = await fetch(`/api/announcements/${announcement.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      })
      
      if (!response.ok) {
        setComments(comments.filter(c => c.id !== tempComment.id))
        setNewComment(commentText)
        throw new Error('Failed to add comment')
      }
      
      const data = await response.json()
      if (data.comment) {
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === tempComment.id ? data.comment : comment
          )
        )
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      setComments(comments.filter(c => c.id !== tempComment.id))
      setNewComment(commentText)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleEdit = async () => {
    if (!announcement.id) return
    setIsEditing(true)

    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          isImportant: editIsImportant,
        }),
      })

      if (!response.ok) throw new Error('Failed to update announcement')

      // Update local state
      setShowEditDialog(false)
      
      // Refresh the announcement data
      await fetchComments()
      await fetchLikes()
    } catch (error) {
      console.error("Error updating announcement:", error)
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!announcement.id) return

    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error('Failed to delete announcement')
      
      setShowDeleteDialog(false)
      
      // Notify parent component
      // if (onAnnouncementDeleted) {
      //   onAnnouncementDeleted(announcement.id)
      // }
    } catch (error) {
      console.error("Error deleting announcement:", error)
    }
  }

  return (
    <Card className={`mb-4 ${announcement.isImportant ? "border-red-500" : ""}`}>
      <CardHeader className="flex flex-row items-center space-x-4">
        <Avatar>
          <AvatarImage src={announcement.author.image || undefined} />
          <AvatarFallback>{announcement.author.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold">{announcement.title}</h3>
          <p className="text-sm text-gray-500">
            {announcement.author.name} • {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
          </p>
        </div>
        {session?.user?.id === announcement.authorId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <p className="mb-4">{announcement.content}</p>
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center space-x-2 ${liked ? "text-red-500" : ""}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            <span>{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{comments.length}</span>
          </Button>
        </div>
        {showComments && (
          <div className="space-y-4">
            {session?.user && (
              <form onSubmit={handleComment} className="flex space-x-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isSubmittingComment}
                />
                <Button type="submit" size="icon" disabled={isSubmittingComment || !newComment.trim()}>
                  {isSubmittingComment ? "..." : <Send className="h-4 w-4" />}
                </Button>
              </form>
            )}
            <div className="space-y-4">
              {isLoadingComments ? (
                // Skeleton loading state for comments
                <>
                  <div className="flex space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                  </div>
                </>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user.image || undefined} />
                      <AvatarFallback>{comment.user.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{comment.user.name}</p>
                      <p className="text-sm text-gray-500">{comment.content}</p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Make changes to your announcement.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Announcement title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Announcement content"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="important"
                checked={editIsImportant}
                onCheckedChange={setEditIsImportant}
              />
              <Label htmlFor="important">Mark as important</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing ? "Saving..." : "Save changes"}
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
              This action cannot be undone. This will permanently delete the announcement and remove it
              from the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

