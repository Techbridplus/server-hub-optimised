"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { CreateServerModal } from "@/components/create-server-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Compass, Star, History, Settings, Sparkles, Bookmark, LogOut, } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { signOut, useSession } from "next-auth/react"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
// import { Group } from "../../generated/prisma";
import { Group } from "../../generated/prisma"

function ServerSidebar() {
    const { data: session } = useSession()
    const [joinedGroups, setJoinedGroups] = useState<Group[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch the user's joined groups
    useEffect(() => {
        const fetchServers = async () => {
            try {
                const groupsRes = await fetch('/api/groups/joined')
                if (!groupsRes.ok) {
                    throw new Error('Failed to fetch data')
                }

                const groupsData = await groupsRes.json()

                setJoinedGroups(groupsData.groups)
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (session?.user) {
            fetchServers()
        }
    }, [session])


    return (
        <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
            <div className="flex h-14 items-center border-b px-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="rounded-full bg-primary p-1">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6 text-primary-foreground"
                        >
                            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                        </svg>
                    </div>
                    <span className="font-bold">Server Hub</span>
                </Link>
            </div>
            <div className="p-4">
                <CreateServerModal
                    className="w-full justify-start gap-2"
                />
            </div>
            <ScrollArea className="flex-1 px-3">


                <div className="space-y-4">
                    <div className="py-2">
                        <h2 className="mb-2 px-4 text-sm font-semibold text-muted-foreground">Discover</h2>
                        <div className="space-y-1">
                            <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                                <Link href="/browse">
                                    <Compass className="h-4 w-4" />
                                    Browse Servers
                                </Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                                <Link href="/trending">
                                    <Sparkles className="h-4 w-4" />
                                    Trending
                                </Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                                <Link href="/featured">
                                    <Star className="h-4 w-4" />
                                    Featured
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <Separator className="mx-4" />

                    <div className="px-4">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-muted-foreground">Joined Groups</h2>
                            <Badge variant="secondary" className="text-xs">
                                {joinedGroups.length}
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            {isLoading ? (
                                <div className="flex justify-center py-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                </div>
                            ) : joinedGroups.length > 0 ? (
                                joinedGroups.map((group) => (
                                    <Button key={group.id} variant="ghost" className="w-full  h-20 justify-start" asChild>
                                        <Link href={`/group/${group.id}`}>
                                            <div className="relative mr-2 h-15 w-15 overflow-hidden rounded-full">
                                                <Image
                                                    src={group.imageUrl || "/placeholder.svg"}
                                                    alt={group.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            {group.name}
                                        </Link>
                                    </Button>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground py-1">No groups joined yet</p>
                            )}
                        </div>
                    </div>

                    <Separator className="mx-4" />

                    <div className="px-4">
                        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recent Activity</h2>
                        <div className="space-y-1">
                            <Button variant="ghost" className="w-full justify-start" asChild>
                                <Link href="/recent">
                                    <History className="mr-2 h-4 w-4" />
                                    Recently Visited
                                </Link>
                            </Button>
                        </div>
                        <Button variant="ghost" className="w-full justify-start" asChild>
                            <Link href="/savedServers">
                                <Bookmark className="h-4 w-4" />
                                Saved Servers
                            </Link>
                        </Button>
                    </div>
                </div>
            </ScrollArea>
            <div className="border-t p-4">
                {session ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start">
                                <Avatar className="h-6 w-6 mr-2">
                                    <AvatarImage src={session.user?.image || "/default-logo.png"} alt={session.user?.name || "User"} />
                                    <AvatarFallback>{session.user?.name?.[0] || "U"}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start text-sm">
                                    <span className="font-medium">{session.user?.name || "User Name"}</span>
                                    <span className="text-xs text-muted-foreground">{session.user?.email || "user@example.com"}</span>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href="/settings">
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </DropdownMenuItem>
                            </Link>

                            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <div className="flex flex-col gap-2">
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/auth/signin">Sign in</Link>
                        </Button>
                        <Button variant="ghost" className="w-full" asChild>
                            <Link href="/auth/signup">Create account</Link>
                        </Button>
                    </div>
                )}
            </div>
        </aside>
    )
}

export default ServerSidebar
