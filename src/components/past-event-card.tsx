import { CalendarDays, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Event } from "../../generated/prisma"

interface PastEventCardProps {
  event: Event
  serverId: string
}

export function PastEventCard({ event, serverId }: PastEventCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md h-full ">
      <div className="relative h-40 w-full">
        <Image 
          src={event.imageUrl || "/placeholder.svg"} 
          alt={event.title} 
          fill 
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover" 
        />
        {event.isExclusive && (
          <div className="absolute right-2 top-2">
            <Badge className="flex items-center gap-1 bg-background/80 text-primary backdrop-blur-sm">
              <Star className="h-3 w-3 fill-primary" />
              Exclusive
            </Badge>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <h3 className="font-semibold">{event.title}</h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{new Date(event.startDate).toLocaleDateString('en-GB')} {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{event.description || "No description available."}</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/server/${serverId}/event/${event.id}`}>
            View Recap
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
} 