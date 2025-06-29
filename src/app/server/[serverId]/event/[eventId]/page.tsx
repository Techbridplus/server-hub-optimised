"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, MapPin, Star, Camera, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ShareDialog } from "@/components/share-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { useParams } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import { UploadButton } from "@/components/upload-button"

import { Event,EventVideo,EventPhoto } from "../../../../../../generated/prisma"

interface EventsWithOther extends Event{
    user:{
        id:string
        name:string
        image:string
    },
    videos:EventVideo[]
    photos:EventPhoto[]
    _count:{
        photos: number
        videos: number
    }

}
export default function EventPage() {
    // Get route parameters using the useParams hook
    const params = useParams()
    const serverId = params.serverId as string
    const eventId = params.eventId as string
    const { data: session } = useSession()

    // State for event data
    const [event, setEvent] = useState<EventsWithOther|null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isModerator, setIsModerator] = useState(false)
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
    const [isUploadingVideo, setIsUploadingVideo] = useState(false)
    const [showAllPhotos, setShowAllPhotos] = useState(false)

    // State for countdown timer
    const [timeRemaining, setTimeRemaining] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isLive: false,
        isPast: false,
    })

    // Fetch event data
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await fetch(`/api/servers/${serverId}/events/${eventId}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch event')
                }
                const data = await response.json()
                setEvent(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred")
                toast({
                    title: "Error",
                    description: "Failed to load event details",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }

        fetchEvent()
    }, [serverId, eventId])

    // Calculate time remaining for the event
    useEffect(() => {
        if (!event) return

        const calculateTimeRemaining = () => {
            const now = new Date()
            const startTime = new Date(event.startDate)
            const endTime = event.endDate ? new Date(event.endDate) : new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours if no end time

            // Check if event is past
            if (now > endTime) {
                setTimeRemaining({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    isLive: false,
                    isPast: true,
                })
                return
            }

            // Check if event is live
            if (now >= startTime && now <= endTime) {
                setTimeRemaining({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    isLive: true,
                    isPast: false,
                })
                return
            }

            // Calculate time remaining until event starts
            const totalSeconds = Math.floor((startTime.getTime() - now.getTime()) / 1000)

            const days = Math.floor(totalSeconds / (60 * 60 * 24))
            const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60))
            const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
            const seconds = Math.floor(totalSeconds % 60)

            setTimeRemaining({
                days,
                hours,
                minutes,
                seconds,
                isLive: false,
                isPast: false,
            })
        }

        calculateTimeRemaining()
        const interval = setInterval(calculateTimeRemaining, 1000)

        return () => clearInterval(interval)
    }, [event])

    // Fetch user role
    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const response = await fetch(`/api/servers/${serverId}/role`)
                if (!response.ok) throw new Error('Failed to fetch user role')
                const data = await response.json()
                setIsAdmin(data.role === "ADMIN")
                setIsModerator(data.role === "MODERATOR")
            } catch (err) {
                console.error("Error fetching user role:", err)
            }
        }

        if (session?.user) {
            fetchUserRole()
        }
    }, [serverId, session])

    const handlePhotoUpload = async (url: string) => {
        try {
            setIsUploadingPhoto(true)
            const response = await fetch(`/api/servers/${serverId}/events/${eventId}/photos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url }),
            })

            if (!response.ok) throw new Error("Failed to upload photo")

            const photo = await response.json()
            setEvent((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    photos: [photo, ...prev.photos],
                };
            });

            toast({
                title: "Success",
                description: "Photo uploaded successfully",
            })
        } catch (error) {
            console.error("Error uploading photo:", error)
            toast({
                title: "Error",
                description: "Failed to upload photo",
                variant: "destructive",
            })
        } finally {
            setIsUploadingPhoto(false)
        }
    }

    const handleVideoUpload = async (url: string) => {
        try {
            setIsUploadingVideo(true)
            const response = await fetch(`/api/servers/${serverId}/events/${eventId}/videos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url,
                    title: "Event Video",
                    // thumbnail: url, // Using the same URL as thumbnail for now
                }),
            })

            if (!response.ok) throw new Error("Failed to upload video")

            const video = await response.json()
            setEvent((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    videos: [video, ...prev.videos],
                };
            });

            toast({
                title: "Success",
                description: "Video uploaded successfully",
            })
        } catch (error) {
            console.error("Error uploading video:", error)
            toast({
                title: "Error",
                description: "Failed to upload video",
                variant: "destructive",
            })
        } finally {
            setIsUploadingVideo(false)
        }
    }

    console.log("Event data:", event)

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center h-[50vh]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-muted-foreground">Loading event details...</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center h-[50vh]">
                        <div className="text-center">
                            <p className="text-destructive">Failed to load event details</p>
                            <Link
                                href={`/server/${serverId}`}
                                className="mt-4 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to server
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link
                        href={`/server/${serverId}`}
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to server
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="overflow-hidden rounded-lg border bg-card">
                            <div className="relative h-[200px] w-full sm:h-[300px]">
                                <Image
                                    src={event.imageUrl || "/placeholder.svg"}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                {event.isExclusive && (
                                    <div className="absolute right-4 top-4">
                                        <Badge className="flex items-center gap-1 bg-background/80 text-primary backdrop-blur-sm">
                                            <Star className="h-3 w-3 fill-primary" />
                                            Exclusive
                                        </Badge>
                                    </div>
                                )}

                                {/* Event status badge */}
                                <div className="absolute left-4 top-4">
                                    {timeRemaining.isLive && <Badge className="bg-green-500 text-white">Live Now</Badge>}
                                    {timeRemaining.isPast && <Badge variant="secondary">Event Ended</Badge>}
                                </div>
                            </div>

                            <div className="p-6">
                                <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{event.title}</h1>
                                <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(event.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            {new Date(event.startDate).toLocaleTimeString()} -
                                            {event.endDate ? new Date(event.endDate).toLocaleTimeString() : 'End time not specified'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        <span>{event.location}</span>
                                    </div>
                                </div>

                                {/* Countdown timer */}
                                {!timeRemaining.isPast && !timeRemaining.isLive && (
                                    <div className="mb-6 rounded-lg bg-muted p-4">
                                        <h2 className="mb-2 text-sm font-medium">Event starts in</h2>
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div className="rounded-md bg-background p-2">
                                                <div className="text-2xl font-bold">{timeRemaining.days}</div>
                                                <div className="text-xs text-muted-foreground">Days</div>
                                            </div>
                                            <div className="rounded-md bg-background p-2">
                                                <div className="text-2xl font-bold">{timeRemaining.hours}</div>
                                                <div className="text-xs text-muted-foreground">Hours</div>
                                            </div>
                                            <div className="rounded-md bg-background p-2">
                                                <div className="text-2xl font-bold">{timeRemaining.minutes}</div>
                                                <div className="text-xs text-muted-foreground">Minutes</div>
                                            </div>
                                            <div className="rounded-md bg-background p-2">
                                                <div className="text-2xl font-bold">{timeRemaining.seconds}</div>
                                                <div className="text-xs text-muted-foreground">Seconds</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Live now indicator */}
                                {timeRemaining.isLive && (
                                    <div className="mb-6 rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                                            <h2 className="font-medium text-green-600 dark:text-green-400">This event is happening now!</h2>
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Join the event using the location details above.
                                        </p>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h2 className="mb-2 text-lg font-semibold">About this event</h2>
                                    <p className="text-muted-foreground">{event.description}</p>
                                </div>

                                <div className="mb-6">
                                    <h2 className="mb-2 text-lg font-semibold">Organized by</h2>
                                    <div className="flex items-center gap-2">
                                        <Avatar>
                                            <AvatarImage src={event.user?.image || "/placeholder.svg"} />
                                            <AvatarFallback>{event.user?.name?.substring(0, 2).toUpperCase() || "UN"}</AvatarFallback>
                                        </Avatar>
                                        <span>{event.user?.name || "Unknown"}</span>
                                    </div>
                                </div>

                                <Separator className="my-6" />

                                {/* Photos and videos section (only for past events) */}
                                {timeRemaining.isPast && (
                                    <div className="mt-6 rounded-lg border bg-card">
                                        <div className="p-6">
                                            <h2 className="mb-4 text-xl font-semibold">Event Memories</h2>

                                            <Tabs defaultValue="photos">
                                                <TabsList className="mb-4">
                                                    <TabsTrigger value="photos" className="flex items-center gap-1">
                                                        <Camera className="h-4 w-4" />
                                                        Photos ({event.photos.length})
                                                    </TabsTrigger>
                                                    <TabsTrigger value="videos" className="flex items-center gap-1">
                                                        <Video className="h-4 w-4" />
                                                        Videos ({event.videos.length})
                                                    </TabsTrigger>
                                                </TabsList>

                                                <TabsContent value="photos">
                                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                                        {(isAdmin || isModerator) && (
                                                            <div className="relative aspect-square overflow-hidden rounded-md border-2 border-dashed">
                                                                <UploadButton
                                                                    type="image"
                                                                    onUpload={handlePhotoUpload}
                                                                    className="flex h-full w-full flex-col items-center justify-center gap-2"
                                                                    disabled={isUploadingPhoto}
                                                                />
                                                                <p className="absolute bottom-2 left-2 right-2 text-center text-xs text-muted-foreground">
                                                                    {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {event.photos.slice(0, showAllPhotos ? undefined : 5).map((photo: EventPhoto) => (
                                                            <Dialog key={photo.id}>
                                                                <DialogTrigger asChild>
                                                                    <div className="relative aspect-square cursor-pointer overflow-hidden rounded-md">
                                                                        <Image
                                                                            src={photo.url || "/placeholder.svg"}
                                                                            alt="Event photo"
                                                                            fill
                                                                            className="object-cover transition-transform hover:scale-105"
                                                                        />
                                                                    </div>
                                                                </DialogTrigger>
                                                                <DialogContent className="sm:max-w-3xl">
                                                                    <div className="relative aspect-video w-full">
                                                                        <Image
                                                                            src={photo.url || "/placeholder.svg"}
                                                                            alt="Event photo"
                                                                            fill
                                                                            className="object-contain"
                                                                        />
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        ))}
                                                    </div>

                                                    {event.photos.length > 5 && (
                                                        <div className="mt-4 flex justify-center">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => setShowAllPhotos(!showAllPhotos)}
                                                            >
                                                                {showAllPhotos ? "Show Less" : `Load More (${event.photos.length - 5} more)`}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TabsContent>

                                                <TabsContent value="videos">
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                        {(isAdmin || isModerator) && (
                                                            <div className="relative aspect-video overflow-hidden rounded-md border-2 border-dashed">
                                                                <UploadButton
                                                                    type="video"
                                                                    onUpload={handleVideoUpload}
                                                                    className="flex h-full w-full flex-col items-center justify-center gap-2"
                                                                    disabled={isUploadingVideo}
                                                                />
                                                                <p className="absolute bottom-2 left-2 right-2 text-center text-xs text-muted-foreground">
                                                                    {isUploadingVideo ? "Uploading..." : "Upload Video"}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {event.videos.map((video: EventVideo) => (
                                                            <Dialog key={video.id}>
                                                                <DialogTrigger asChild>
                                                                    <div className="relative aspect-video cursor-pointer overflow-hidden rounded-md">
                                                                        <Image
                                                                            src={video.thumbnail || "/placeholder.svg"}
                                                                            alt="Video thumbnail"
                                                                            fill
                                                                            className="object-cover transition-transform hover:scale-105"
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                                            <div className="rounded-full bg-white/80 p-3">
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    viewBox="0 0 24 24"
                                                                                    fill="currentColor"
                                                                                    className="h-6 w-6 text-primary"
                                                                                >
                                                                                    <path d="M8 5v14l11-7z" />
                                                                                </svg>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </DialogTrigger>
                                                                <DialogContent className="sm:max-w-3xl">
                                                                    <div className="relative aspect-video w-full">
                                                                        <Image
                                                                            src={video.thumbnail || "/placeholder.svg"}
                                                                            alt="Video thumbnail"
                                                                            fill
                                                                            className="object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                                            <div className="rounded-full bg-white/80 p-3">
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    viewBox="0 0 24 24"
                                                                                    fill="currentColor"
                                                                                    className="h-6 w-6 text-primary"
                                                                                >
                                                                                    <path d="M8 5v14l11-7z" />
                                                                                </svg>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        ))}
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </div>
                                )}

                                {/* Comments section */}
                                {/* <div className="mb-6">
                  <h2 className="mb-4 text-lg font-semibold">Comments</h2>
                  <CommentSection
                    resourceId={eventId}
                    resourceType="event"
                  />
                </div> */}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Event details card */}
                        <div className="rounded-lg border bg-card p-6">
                            <h2 className="mb-4 text-lg font-semibold">Event Details</h2>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p className="font-medium">Status</p>
                                    <p className="text-muted-foreground">
                                        {timeRemaining.isPast ? "Completed" : timeRemaining.isLive ? "Live Now" : "Upcoming"}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium">Visibility</p>
                                    <p className="text-muted-foreground">{event.isExclusive ? "Exclusive (Members Only)" : "Public"}</p>
                                </div>
                                {/* <div>
                                    <p className="font-medium">Attendees</p>
                                    <p className="text-muted-foreground">
                                        {event._count?.attendees || 0} attending
                                        {event.maxAttendees ? ` (${event.maxAttendees} max)` : ""}
                                    </p>
                                </div> */}
                            </div>
                        </div>

                        {/* Share card */}
                        <div className="rounded-lg border bg-card p-6">
                            <h2 className="mb-4 text-lg font-semibold">Share Event</h2>
                            <ShareDialog
                                title={event.title}
                                url={`${window.location.origin}/server/${serverId}/event/${eventId}`}
                                type="event"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

