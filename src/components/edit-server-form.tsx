"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { Camera, Loader2, Save, Trash, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import axios from "axios"
import { Server } from "../../generated/prisma"
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
import { useRouter } from "next/navigation"

interface EditServerFormProps {
  serverId: string
  onSave: () => void
}

export function EditServerForm({ serverId, onSave }: EditServerFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [ServerData, setServerData] = useState<Server | null>(null)
  const [originalServerData, setOriginalServerData] = useState<Server | null>(null)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteTimeRemaining, setDeleteTimeRemaining] = useState<number | null>(null)
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null)
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [scheduledDeletionId, setScheduledDeletionId] = useState<string | null>(null)

  const isDataEdited = JSON.stringify(ServerData) !== JSON.stringify(originalServerData)

  // Check for existing scheduled deletion on component mount
  useEffect(() => {
    const checkExistingDeletion = async () => {
      try {
        const response = await axios.get(`/api/servers/${serverId}/deletion-status`)
        if (response.data.isScheduled) {
          const { remainingSeconds, deletionId } = response.data
          
          if (remainingSeconds > 0) {
            setIsDeleting(true)
            setDeleteTimeRemaining(remainingSeconds)
            setScheduledDeletionId(deletionId)
            
            // Set up the countdown timer
            deleteTimerRef.current = setInterval(() => {
              setDeleteTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                  clearInterval(deleteTimerRef.current!)
                  return 0
                }
                return prev - 1
              })
            }, 1000)
            
            // Set up the actual deletion
            const timeUntilDeletion = remainingSeconds * 1000
            deleteTimeoutRef.current = setTimeout(() => {
              deleteServer()
            }, timeUntilDeletion)
            
            toast({
              title: "Server deletion in progress",
              description: `Your server will be deleted in ${formatTimeRemaining(remainingSeconds)}. You can cancel this action until then.`,
            })
          } else {
            // Timer has expired, delete the server immediately
            deleteServer()
          }
        }
      } catch (error) {
        console.error("Error checking deletion status:", error)
      }
    }
    
    checkExistingDeletion()
  }, [serverId])

  useEffect(() => {
    const fetchServerData = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get<Server>(`/api/servers/${serverId}`)
        const serverData = response.data
        setServerData(serverData)
        setOriginalServerData(serverData)
      } catch (error) {
        console.error("Error fetching server data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchServerData()
  }, [serverId])

  // Clean up timers on component unmount
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearInterval(deleteTimerRef.current)
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
    }
  }, [])

  const handleSave = async () => {
    if (!ServerData) return;
    
    setIsLoading(true);
    
    try {
      // Prepare the data to send to the API
      const updatedData = {
        name: ServerData.name,
        description: ServerData.description,
        category: ServerData.category,
        isPrivate: ServerData.isPrivate,
        isExclusive: ServerData.isExclusive,
        accessKey: ServerData.accessKey,
        imageUrl: ServerData.imageUrl,
        bannerUrl: ServerData.bannerUrl,
      };
      
      // Send the update request to the API
      await axios.put(`/api/servers/${serverId}`, updatedData);
      
      // Update the original data to match the current data
      setOriginalServerData(ServerData);
      
      toast({
        title: "Server updated",
        description: "Your server has been updated successfully.",
      });
      
      // Call the onSave callback to notify the parent component
      onSave();
    } catch (error) {
      console.error("Error updating server:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating your server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof Server, value: string | boolean) => {
    setServerData((prev) => ({
      ...prev!,
      [field]: value,
    }))
  }

  const removeFileFromCloud = async (url: string) => {
    try {
      await axios.delete("/api/upload", { data: { url } });
    } catch (error) {
      console.error("Error removing file from cloud:", error);
      toast({
        title: "File removal failed",
        description: "There was an error removing the existing file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File, type: "banner" | "logo") => {
    if (type === "banner") {
      setIsUploadingBanner(true);
    } else {
      setIsUploadingLogo(true);
    }

    try {
      // Remove existing file from cloud
      const existingUrl = type === "banner" ? ServerData?.bannerUrl : ServerData?.imageUrl;
      if (existingUrl) {
        await removeFileFromCloud(existingUrl);
      }

      // Upload new file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type === "banner" ? "image" : "image");

      const response = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.url) {
        setServerData((prev) => ({
          ...prev!,
          [type === "banner" ? "bannerUrl" : "imageUrl"]: response.data.url,
        }));
        toast({
          title: "Upload successful",
          description: `The ${type} has been updated successfully.`,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (type === "banner") {
        setIsUploadingBanner(false);
      } else {
        setIsUploadingLogo(false);
      }
    }
  };

  const initiateDeleteServer = () => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteServer = async () => {
    setIsDeleteDialogOpen(false)
    setIsDeleting(true)
    
    try {
      // Schedule deletion on the server
      const response = await axios.post(`/api/servers/${serverId}/schedule-deletion`, {
        delayMinutes: 10
      })
      
      if (response.data.success) {
        setScheduledDeletionId(response.data.deletionId)
        
        // Set up a 10-minute countdown (600 seconds)
        setDeleteTimeRemaining(600)
        
        // Update the countdown every second
        deleteTimerRef.current = setInterval(() => {
          setDeleteTimeRemaining((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(deleteTimerRef.current!)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        
        // Set up the actual deletion after 10 minutes
        deleteTimeoutRef.current = setTimeout(() => {
          deleteServer()
        }, 600 * 1000) // 10 minutes in milliseconds
        
        toast({
          title: "Server deletion scheduled",
          description: "Your server will be deleted in 10 minutes. You can cancel this action until then.",
        })
      } else {
        throw new Error("Failed to schedule deletion")
      }
    } catch (error) {
      console.error("Error scheduling deletion:", error)
      toast({
        title: "Deletion scheduling failed",
        description: "There was an error scheduling the server deletion. Please try again.",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  const cancelDeleteServer = async () => {
    if (deleteTimerRef.current) clearInterval(deleteTimerRef.current)
    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
    
    if (scheduledDeletionId) {
      try {
        // Cancel scheduled deletion on the server
        await axios.post(`/api/servers/${serverId}/cancel-deletion`, {
          deletionId: scheduledDeletionId
        })
        
        setScheduledDeletionId(null)
        setIsDeleting(false)
        setDeleteTimeRemaining(null)
        
        toast({
          title: "Deletion cancelled",
          description: "Your server deletion has been cancelled.",
        })
      } catch (error) {
        console.error("Error cancelling deletion:", error)
        toast({
          title: "Cancellation failed",
          description: "There was an error cancelling the server deletion. Please try again.",
          variant: "destructive",
        })
      }
    } else {
      setIsDeleting(false)
      setDeleteTimeRemaining(null)
    }
  }

  const deleteServer = async () => {
    try {
      // If we have a scheduled deletion ID, use it to confirm the deletion
      if (scheduledDeletionId) {
        await axios.post(`/api/servers/${serverId}/confirm-deletion`, {
          deletionId: scheduledDeletionId
        })
      } else {
        // Fallback to direct deletion if no scheduled deletion exists
        await axios.delete(`/api/servers/${serverId}`)
      }
      
      toast({
        title: "Server deleted",
        description: "Your server has been permanently deleted.",
      })
      
      // Redirect to home page
      router.push("/")
    } catch (error) {
      console.error("Error deleting server:", error)
      toast({
        title: "Deletion failed",
        description: "There was an error deleting your server. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!ServerData) {
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Server Information</CardTitle>
          <CardDescription>Update your server&apos;s basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{ServerData?.name}</Label>
            <Input id="name" value={ServerData?.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{ServerData?.description}</Label>
            <Textarea
              id="description"
              value={ServerData?.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={ServerData.category} onValueChange={(value) => handleChange("category", value)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="exclusive"
              checked={ServerData.isExclusive}
              onCheckedChange={(checked) => handleChange("isExclusive", checked)}
            />
            <Label htmlFor="exclusive">Make this server exclusive</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="private"
              checked={ServerData.isPrivate}
              onCheckedChange={(checked) => handleChange("isPrivate", checked)}
            />
            <Label htmlFor="private">Make this server private</Label>
          </div>

          {ServerData.isPrivate && (
            <div className="grid gap-2">
              <Label htmlFor="accessKey">Access Key</Label>
              <Input 
                id="accessKey" 
                value={ServerData.accessKey || ""} 
                onChange={(e) => handleChange("accessKey", e.target.value)}
                placeholder="Enter access key for private server"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server Media</CardTitle>
          <CardDescription>Update your server&apos;s banner and logo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Server Banner</Label>
            <div className="relative h-[200px] w-full overflow-hidden rounded-lg border">
              <Image src={ServerData.bannerUrl || "/placeholder.svg"} alt="Server banner" fill className="object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isUploadingBanner}
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = "image/*"
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) handleFileUpload(file, "banner")
                      }
                      input.click()
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    { isUploadingBanner ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Server Logo</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-lg border">
                <Image src={ServerData.imageUrl || "/placeholder.svg"} alt="Server logo" fill className="object-cover" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute inset-0 flex h-full w-full items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
                  onClick={() => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = "image/*"
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleFileUpload(file, "logo")
                    }
                    input.click()
                  }}
                >
                  <Camera className="h-6 w-6 text-white" />
                </Button>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Server Logo</p>
                <p className="text-xs text-muted-foreground">Recommended size: 100x100px</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploadingLogo}
                  onClick={() => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = "image/*"
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) handleFileUpload(file, "logo")
                    }
                    input.click()
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  { isUploadingLogo? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for your server</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
            <h3 className="text-sm font-medium text-destructive">Delete Server</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Once you delete a server, there is no going back. This action is permanent and will remove all content,
              members, and settings.
            </p>
            
            {isDeleting ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Server will be deleted in: <span className="text-destructive">{formatTimeRemaining(deleteTimeRemaining || 0)}</span></p>
                  <Button variant="outline" size="sm" onClick={cancelDeleteServer}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Deletion
                  </Button>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div 
                    className="h-2 rounded-full bg-destructive transition-all duration-1000" 
                    style={{ width: `${((deleteTimeRemaining || 0) / 600) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <Button variant="destructive" size="sm" className="mt-4" onClick={initiateDeleteServer}>
                <Trash className="mr-2 h-4 w-4" />
                Delete Server
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onSave}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading || !isDataEdited}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will schedule your server for deletion in 10 minutes. You can cancel this action during the 10-minute window.
              After the 10-minute period, your server will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteServer}>Schedule Deletion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

