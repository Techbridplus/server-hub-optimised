"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ChevronRight, Edit, MessageSquare, Users, Menu, Shield, UserPlus, Lock, Home, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import ModernEventCarousel from "@/components/modern-event-carousel"
import { AnnouncementCard } from "@/components/announcement-card"
import { GroupCard } from "@/components/group-card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ShareDialog } from "@/components/share-dialog"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { CreateAnnouncementDialog } from "@/components/create-announcement-dialog"
import { CreateGroupDialog } from "@/components/create-group-dialog"
import { MembersDialog } from "@/components/manage-members-dialog"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import React from "react"
import { useParams } from "next/navigation"
import { Server, MemberRole, Event, Group, Announcement } from "../../../../generated/prisma"
import { PastEventCard } from "@/components/past-event-card"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import NotificationSystem from "@/components/notification-system"


// Define the AnnouncementWithAuthor interface
interface AnnouncementWithAuthor extends Announcement {
    author: {
        id: string;
        name: string | null; // Updated to allow null
        image: string | null; // Updated to allow null
    };
    _count: {
        likes: number;
        comments: number;
    };
}

// Extend the Server type to include the `members` property
interface ServerWithMembers extends Server {
    members: { role: MemberRole }[];
    events: Event[];
    groups: Group[];
    announcements: AnnouncementWithAuthor[];
    _count: {
        members: number;
        events: number;
        groups: number;
        announcements: number;
    };
}



export default function ServerPage() {

    const { toast } = useToast()
    
    // Server data
    const [server, setServer] = useState<ServerWithMembers | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [userRole, setUserRole] = useState<MemberRole>(MemberRole.VISITOR)
    const params = useParams<{ serverId: string }>();
    const serverId = params.serverId

    const isAdmin = userRole === MemberRole.ADMIN
    const isModerator = userRole === MemberRole.MODERATOR
    const hasEditRights = isAdmin || isModerator

      // Join server handler
  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // Events data
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  // Groups data
  const [groups, setGroups] = useState<Group[]>([])
  // Join server handler
  const handleJoinServer = async () => {
    try {
      setIsJoining(true)
      await axios.post(`/api/servers/${serverId}/join`)

      toast({
        title: "Success",
        description: "You have joined the server",
      })

      // Update server data
      const serverData = await axios.get<ServerWithMembers>(`/api/servers/${serverId}`)
      setServer(serverData.data)

      // Update user role
      setUserRole(MemberRole.MEMBER)
    } catch (error) {
      console.error("Error joining server:", error)
      toast({
        title: "Error",
        description: "Failed to join server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }
  // Announcements data
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([])
//   const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false)


    // Load server data and check access
    useEffect(() => {
        const loadServerData = async () => {
          try {
            // Fetch server data
            const serverRes = await axios.get<ServerWithMembers>(`/api/servers/${serverId}`);
            if (!serverRes.status) throw new Error("Failed to fetch server data");
            const serverData = serverRes.data;
    
            setServer(serverData);
    
            // Set the user's role based on the `members` array
            if (serverData.members.length > 0) {
              setUserRole(serverData.members[0].role);
            }
    
            // Distribute events into upcoming and past
            const now = new Date();
            const upcoming = serverData.events.filter(
              (event) => event.startDate && new Date(event.startDate) > now
            );
            const past = serverData.events.filter(
              (event) => event.endDate && new Date(event.endDate) < now
            );
    
            setUpcomingEvents(upcoming);
            setPastEvents(past);
            
            // Set announcements and groups from server data
            setAnnouncements(serverData.announcements || []);
            setGroups(serverData.groups || []);
    
            setIsLoading(false);
          } catch (error) {
            console.error("Error loading server data:", error);
            toast({
              title: "Error",
              description: "Failed to load server data. Please try again.",
              variant: "destructive",
            });
            setIsLoading(false);
          }
        };
    
        loadServerData();
      }, [serverId, toast]);
    

  // Add leave server handler
  const handleLeaveServer = async () => {
    try {
      setIsLeaving(true)
      const response = await fetch(`/api/servers/${serverId}/leave`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to leave server')
      }
      
      // Redirect to home page after leaving
      window.location.href = '/'
    } catch (error) {
      console.error('Error leaving server:', error)
      toast({
        title: "Error",
        description: "Failed to leave server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLeaving(false)
    }
  }

  // Function to refresh groups
  const refreshGroups = async () => {
    try {
      const response = await axios.get(`/api/servers/${serverId}/groups`); 
      setGroups(response.data.groups);
    } catch (error) {
      console.error("Error refreshing groups:", error);
      toast({
        title: "Error",
        description: "Failed to refresh groups. Please try again.",
        variant: "destructive",
      });
    }
  };

    if (isLoading) {
        return (
          <div className="flex h-screen items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )
      }

    if (!server) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Server not found</h1>
                    <p className="text-muted-foreground">The server you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
                    <Button className="mt-4" asChild>
                        <Link href="/">Go Home</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="relative h-[200px] w-full md:h-[300px]">
                <Image
                    src={server?.bannerUrl || "/placeholder.svg"}
                    alt={`${server?.name} banner`}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>

            <div className="container relative -mt-20 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col items-start sm:flex-row sm:items-end sm:gap-4">
                        <div className="relative h-24 w-24 overflow-hidden rounded-lg border-4 border-background bg-background sm:h-32 sm:w-32">
                            <Image
                                src={server.imageUrl || "/placeholder.svg"}
                                alt={`${server.name} logo`}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <div className="mt-2 flex items-center gap-2">
                                <h1 className="text-2xl font-bold sm:text-3xl">{server.name}</h1>
                                {server.isPrivate && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-500">
                                        <Lock className="mr-1 h-3 w-3" />
                                        Private
                                    </Badge>
                                )}
                                {isAdmin && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-500">
                                        <Shield className="mr-1 h-3 w-3" />
                                        Admin
                                    </Badge>
                                )}
                                {isModerator && (
                                    <Badge variant="outline" className="border-primary text-primary">
                                        <Shield className="mr-1 h-3 w-3" />
                                        Moderator
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{server._count.members} members</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">

                            <NotificationSystem />



                        <Button variant="outline" className="flex-1 sm:flex-none" asChild>
                            <Link href="/">
                                <Home className="mr-2 h-4 w-4" />
                                Home
                            </Link>
                        </Button>
                        {isAdmin && (
                            <>
                                <Button className="flex-1 sm:flex-none" asChild >
                                    <Link href={`/server/${serverId}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Server
                                    </Link>
                                </Button>
                            </>
                        )}
                        <MembersDialog serverId={serverId} />
                        {userRole === MemberRole.VISITOR && (
                            <Button
                                className="flex-1 sm:flex-none"
                                onClick={handleJoinServer}
                                disabled={isJoining || isLeaving}
                            >
                                {isJoining ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Joining...
                                    </>
                                ) : server.isPrivate ? (
                                    <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Request Access
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Join Server
                                    </>
                                )}
                            </Button>
                        )}
                        {userRole === MemberRole.MEMBER && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        className="flex-1 sm:flex-none"
                                        disabled={isJoining || isLeaving}
                                    >
                                        {isLeaving ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                Leaving...
                                            </>
                                        ) : (
                                            <>
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Leave Server
                                            </>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Leave Server</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to leave {server.name}? You will need to request access again if you want to rejoin.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleLeaveServer} disabled={isLeaving}>
                                            {isLeaving ? (
                                                <>
                                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    Leaving...
                                                </>
                                            ) : (
                                                "Leave Server"
                                            )}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <ShareDialog title={server.name} url={`/server/${serverId}`} type="server" />
                    </div>
                </div>

                <div className="mt-6">
                    <p className="text-muted-foreground">{server.description}</p>
                </div>

                {/* Mobile tabs navigation */}
                <div className="mt-8 md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                                <span>Navigate Server</span>
                                <Menu className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[50vh]">
                            <div className="grid gap-4 py-4">
                                <Button variant="ghost" className="justify-start" asChild>
                                    <Link href="#events">
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        Events
                                    </Link>
                                </Button>
                                {(server.isPrivate) && (
                                    <>
                                        <Button variant="ghost" className="justify-start" asChild>
                                            <Link href="#announcements">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Announcements
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" className="justify-start" asChild>
                                            <Link href="#groups">
                                                <Users className="mr-2 h-4 w-4" />
                                                Groups
                                            </Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Desktop tabs */}
                <Tabs defaultValue="events" className="mt-8">
                    <TabsList className="hidden w-full justify-start md:flex">
                        <TabsTrigger value="events" className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            Events
                        </TabsTrigger>
                        {(!server.isPrivate) && (
                            <>
                                <TabsTrigger value="announcements" className="flex items-center gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    Announcements
                                </TabsTrigger>
                                <TabsTrigger value="groups" className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    Groups
                                </TabsTrigger>
                            </>
                        )}
                        {server.isPrivate && (
                            <div className="ml-auto flex items-center">
                                <Badge variant="outline" className="flex gap-1 text-amber-500">
                                    <Lock className="h-3 w-3" />
                                    Join this server to view all content
                                </Badge>
                            </div>
                        )}
                    </TabsList>

                    <TabsContent value="events" className="mt-6 space-y-8 animate-fade-in" id="events">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Upcoming Events</h2>
                            {hasEditRights && (
                                <CreateEventDialog
                                    serverId={serverId}
                                />
                            )}
                        </div>

                        {/* Today's events */}
                        {upcomingEvents.length > 0 && (
                            <div className="">

                                <ModernEventCarousel events={upcomingEvents} serverId={serverId} />
                            </div>
                        )}

                        {/* No upcoming events */}
                        {Object.values(upcomingEvents).length == 0 && (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                                <h3 className="mb-2 text-lg font-semibold">No upcoming events</h3>
                                <p className="mb-4 text-sm text-muted-foreground">
                                    {hasEditRights ? "Create an event to get started" : "Check back later for upcoming events"}
                                </p>
                                {hasEditRights && (
                                    <CreateEventDialog
                                        serverId={serverId}
                                    />
                                )}
                            </div>
                        )}

                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold">Past Events</h3>
                                <Button variant="ghost" size="sm" className="gap-1" asChild>
                                    <Link href={`/server/${serverId}/past-events`}>
                                        View all <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            {pastEvents.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                                    {pastEvents.map((event) => (
                                        <PastEventCard key={event.id} event={event} serverId={serverId} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center mb-4">
                                    <h3 className="mb-2 text-lg font-semibold">No past events</h3>
                                    <p className="mb-4 text-sm text-muted-foreground">
                                        {hasEditRights ? "Create an event to get started" : "Check back later for past events"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {(!server.isPrivate) && (
                        <>
                            <TabsContent value="announcements" className="mt-6 space-y-8 animate-fade-in" id="announcements">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Announcements</h2>
                                    {hasEditRights && (
                                        <CreateAnnouncementDialog
                                            serverId={serverId}
                                        />
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {isLoading ? (
                                        // Skeleton loading state for announcements
                                        <>
                                            <div className="mb-4">
                                                <div className="flex items-center space-x-4 mb-4">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-32" />
                                                        <Skeleton className="h-3 w-24" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-3/4 mb-4" />
                                                <div className="flex space-x-4">
                                                    <Skeleton className="h-8 w-16" />
                                                    <Skeleton className="h-8 w-16" />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center space-x-4 mb-4">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-40" />
                                                        <Skeleton className="h-3 w-28" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-5/6 mb-4" />
                                                <div className="flex space-x-4">
                                                    <Skeleton className="h-8 w-16" />
                                                    <Skeleton className="h-8 w-16" />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center space-x-4 mb-4">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-36" />
                                                        <Skeleton className="h-3 w-20" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-2/3 mb-4" />
                                                <div className="flex space-x-4">
                                                    <Skeleton className="h-8 w-16" />
                                                    <Skeleton className="h-8 w-16" />
                                                </div>
                                            </div>
                                        </>
                                    ) : announcements.length > 0 ? (
                                        announcements.map((announcement) => (
                                            <div className="mb-4" key={announcement.id}>
                                                <AnnouncementCard
                                                    key={announcement.id}
                                                    announcement={announcement}
                                                    // onAnnouncementUpdated={handleAnnouncementUpdated}
                                                    // onAnnouncementDeleted={handleAnnouncementDeleted}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                                            <h3 className="mb-2 text-lg font-semibold">No announcements yet</h3>
                                            <p className="mb-4 text-sm text-muted-foreground">
                                                {hasEditRights ? "Create an announcement to get started" : "Check back later for announcements"}
                                            </p>
                                            {hasEditRights && (
                                                <CreateAnnouncementDialog
                                                    serverId={serverId}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="groups" className="mt-6 space-y-8 animate-fade-in" id="groups">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Groups</h2>
                                    {hasEditRights && (
                                        <CreateGroupDialog
                                            serverId={serverId}
                                            onGroupCreated={refreshGroups}
                                        />
                                    )}
                                </div>

                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {groups.length > 0 ? (
                                        groups.map((group) => (
                                            <GroupCard
                                                key={group.id}
                                                group={group}
                                                serverId={serverId}
                                                canEdit={hasEditRights}
                                            />
                                        ))
                                    ) : (
                                        <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                                            <h3 className="mb-2 text-lg font-semibold">No groups yet</h3>
                                            <p className="mb-4 text-sm text-muted-foreground">
                                                {hasEditRights ? "Create a group to get started" : "Check back later for groups"}
                                            </p>
                                            {hasEditRights && (
                                                <CreateGroupDialog
                                                    serverId={serverId}
                                                    onGroupCreated={refreshGroups}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </>
                    )}
                </Tabs>

                {/* Mobile content sections */}
                <div className="mt-8 space-y-12 md:hidden">
                    <section id="events" className="space-y-8 scroll-mt-16">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Upcoming Events</h2>
                            {hasEditRights && (
                                <CreateEventDialog
                                    serverId={serverId}
                                    buttonSize="sm"
                                />
                            )}
                        </div>

                        {/* Today's events */}
                        {upcomingEvents.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Today</h3>
                                <ModernEventCarousel events={upcomingEvents} serverId={serverId} />
                            </div>
                        )}

                        {/* Tomorrow's events */}
                        {upcomingEvents.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Tomorrow</h3>
                                <ModernEventCarousel events={upcomingEvents} serverId={serverId} />
                            </div>
                        )}

                        {/* This week's events */}
                        {upcomingEvents.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">This Week</h3>
                                <ModernEventCarousel events={upcomingEvents} serverId={serverId} />
                            </div>
                        )}

                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-semibold">Past Events</h3>
                                <Button variant="ghost" size="sm" className="gap-1" asChild>
                                    <Link href={`/server/${serverId}/past-events`}>
                                        View all <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            {pastEvents.length > 0 ? (
                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                    {pastEvents.map((event) => (
                                        <PastEventCard key={event.id} event={event} serverId={serverId} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                                    <h3 className="mb-2 text-lg font-semibold">No past events</h3>
                                    <p className="mb-4 text-sm text-muted-foreground">
                                        {hasEditRights ? "Create an event to get started" : "Check back later for past events"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {(!server.isPrivate) && (
                        <>
                            <section id="announcements" className="space-y-8 scroll-mt-16">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Announcements</h2>
                                    {hasEditRights && (
                                        <CreateAnnouncementDialog
                                            serverId={serverId}
                                            buttonSize="sm"
                                        />
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {isLoading? (
                                        // Skeleton loading state for announcements
                                        <>
                                            <div className="mb-4">
                                                <div className="flex items-center space-x-4 mb-4">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-32" />
                                                        <Skeleton className="h-3 w-24" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-3/4 mb-4" />
                                                <div className="flex space-x-4">
                                                    <Skeleton className="h-8 w-16" />
                                                    <Skeleton className="h-8 w-16" />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center space-x-4 mb-4">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-40" />
                                                        <Skeleton className="h-3 w-28" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-5/6 mb-4" />
                                                <div className="flex space-x-4">
                                                    <Skeleton className="h-8 w-16" />
                                                    <Skeleton className="h-8 w-16" />
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center space-x-4 mb-4">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-36" />
                                                        <Skeleton className="h-3 w-20" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-2/3 mb-4" />
                                                <div className="flex space-x-4">
                                                    <Skeleton className="h-8 w-16" />
                                                    <Skeleton className="h-8 w-16" />
                                                </div>
                                            </div>
                                        </>
                                    ) : announcements.length > 0 ? (
                                        announcements.map((announcement) => (
                                            <AnnouncementCard
                                                key={announcement.id}
                                                announcement={announcement}
                                            />
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                                            <h3 className="mb-2 text-lg font-semibold">No announcements yet</h3>
                                            <p className="mb-4 text-sm text-muted-foreground">
                                                {hasEditRights ? "Create an announcement to get started" : "Check back later for announcements"}
                                            </p>
                                            {hasEditRights && (
                                                <CreateAnnouncementDialog
                                                    serverId={serverId}
                                                    buttonSize="sm"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section id="groups" className="space-y-8 scroll-mt-16">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Groups</h2>
                                    {hasEditRights && (
                                        <CreateGroupDialog
                                            serverId={serverId}
                                            buttonSize="sm"
                                            onGroupCreated={refreshGroups}
                                        />
                                    )}
                                </div>

                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                    {groups.length > 0 ? (
                                        groups.map((group) => (
                                            <GroupCard
                                                key={group.id}
                                                group={group}
                                                serverId={server.id}
                                                canEdit={hasEditRights}
                                            />
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                                            <h3 className="mb-2 text-lg font-semibold">No groups yet</h3>
                                            <p className="mb-4 text-sm text-muted-foreground">
                                                {hasEditRights ? "Create a group to get started" : "Check back later for groups"}
                                            </p>
                                            {hasEditRights && (
                                                <CreateGroupDialog
                                                    serverId={serverId}
                                                    buttonSize="sm"
                                                    onGroupCreated={refreshGroups}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}