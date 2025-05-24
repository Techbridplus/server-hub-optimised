"use client"

import { Crown, Users, Lock, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Server } from "../../generated/prisma"


interface ServerCardProps {
  server: Server&{
    _count?: {
      members: number
    }
  }
  isAdmin: boolean
  isJoined?: boolean
  featured?: boolean
  onJoin?: () => void
}

export function ServerCard({
  server,
  isAdmin,
  isJoined = false,
  featured = false,
  onJoin,
}: ServerCardProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const handleJoin = async () => {
    if (onJoin) {
      setIsJoining(true);
      try {
        await onJoin();
      } finally {
        setIsJoining(false);
      }
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      const response = await fetch(`/api/servers/${server.id}/leave`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to leave server');
      }
      
      // Refresh the page to update the UI
      window.location.reload();
    } catch (error) {
      console.error('Error leaving server:', error);
    } finally {
      setIsLeaving(false);
    }
  };

    return (
      <Card
        className={cn(
          "overflow-hidden transition-all hover:shadow-md h-full",
          featured ? "border-primary/50" : "",
          server.isPrivate ? "border-amber-500/20" : "",
        )}
      >
        <div className="relative">
          <div className="absolute right-2 top-2 flex flex-col gap-1 z-10 ">
            {server.isExclusive && (
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                <Star className="mr-1 h-3 w-3 text-amber-500" />
                Exclusive
              </Badge>
            )}
            {server.isPrivate && (
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm z-10">
                <Lock className="mr-1 h-3 w-3 text-amber-500" />
                Private
              </Badge>
            )}
          </div>
          <div className="relative h-32 w-full">
            <Image
              src={server.bannerUrl || "/placeholder-banner.svg"}
              alt={`${server.name} banner`}
              fill
              className="object-cover"
            />
          </div>
        </div>
        <div className="space-y-4 p-4 bg-primary/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border-4 border-background">
                  <Image
                    src={server.imageUrl || "/placeholder.svg"}
                    alt={server.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="line-clamp-1 font-semibold">{server.name}</h3>
                  <p className="text-xs text-muted-foreground">{server.category}</p>
                </div>
              </div>
            </div>
            {isAdmin && <Crown className="h-4 w-4 text-amber-500" />}
          </div>

            <p className="line-clamp-2 text-sm text-muted-foreground h-[20px]">{server.description}</p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{(server._count?.members || 0).toLocaleString()} members</span>
          </div>

          <div className="flex justify-center gap-2">
            {isAdmin ? (
              <Button variant="default" className="w-full" asChild>
                <Link href={`/server/${server.id}`}>
                  Manage
                </Link>
              </Button>
            ) : (
              <>
                {!server.isPrivate && (
                  <Button className=" transition-all duration-300 w-1/2" asChild>
                    <Link href={`/server/${server.id}`}>
                      View
                    </Link>
                  </Button>
                )}
                {!isJoined ? (
                  <Button 
                    variant="default" 
                    className={server.isPrivate ? "w-full": "w-1/2"} 
                    onClick={handleJoin}
                    disabled={isJoining}
                  >
                    {isJoining ? "Joining..." : (server.isPrivate ? "Request Access" : "Join")}
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className=" transition-all duration-300 hover:bg-destructive/90 w-1/2"
                        disabled={isLeaving}
                      >
                        {isLeaving ? "Leaving..." : "Leave"}
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
                        <AlertDialogAction onClick={handleLeave} disabled={isLeaving}>
                          {isLeaving ? "Leaving..." : "Leave Server"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
              </>
            )}
          </div>
        </div>
      </Card>
    )
  }

