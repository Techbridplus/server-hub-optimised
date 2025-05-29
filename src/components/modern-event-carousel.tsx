"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { Event } from "../../generated/prisma"
// Sample event data structure (replace with your actual data)

interface EventCarouselProps {
  events: Event[]
  autoScroll?: boolean
  autoScrollInterval?: number
  serverId: string
}

export default function ModernEventCarousel({ events, autoScroll = true, autoScrollInterval = 5000, serverId }: EventCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  // Update current index when slide changes
  useEffect(() => {
    if (!api) return

    const handleSelect = () => {
      setCurrent(api.selectedScrollSnap())
    }

    api.on("select", handleSelect)
    return () => {
      api.off("select", handleSelect)
    }
  }, [api])

  // Auto-scroll functionality
  useEffect(() => {
    if (!api || !autoScroll) return

    const interval = setInterval(() => {
      api.scrollNext()
    }, autoScrollInterval)

    return () => clearInterval(interval)
  }, [api, autoScroll, autoScrollInterval])

  if (!events.length) {
    return <div className="text-center py-10">No events available</div>
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <Carousel
        setApi={setApi}
        className="w-full"
        opts={{
          loop: true,
        }}
      >
        <CarouselContent>
          {events.map((event, index) => (
            <CarouselItem key={event.id}>
              <Link href={`/server/${serverId}/event/${event.id}`} className="block relative group">
                <div className="relative aspect-[21/9] md:aspect-[3/1] overflow-hidden rounded-xl">
                  <Image
                    src={event.imageUrl || "/placeholder.svg"}
                    alt={event.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-80" />

                  {/* Event details overlay */}
                  <div className="absolute bottom-0 left-0 p-3 md:p-4 w-full md:w-2/3 text-white z-10">
                    <h3
                      className="text-lg md:text-xl font-bold mb-1 line-clamp-1 overflow-hidden text-ellipsis group-hover:underline"
                      title={event.title}
                    >
                      {event.title}
                    </h3>
                    <div className="flex flex-col md:flex-row gap-1 md:gap-3 text-xs md:text-sm opacity-90">
                      <span className="flex items-center">{new Date(event.startDate).toLocaleDateString()}</span>
                      <span className="hidden md:inline-block">•</span>
                      <span className="flex items-center">{event.location || "No location specified"}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 py-1 h-auto text-xs md:text-sm bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-colors"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/20 backdrop-blur-md border-white/10 text-white hover:bg-white/30 z-10" />
        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/20 backdrop-blur-md border-white/10 text-white hover:bg-white/30 z-10" />
      </Carousel>

      {/* Slide indicators */}
      <div className="flex justify-center gap-1.5 mt-2">
        {events.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              current === index ? "bg-primary w-8" : "bg-gray-300 hover:bg-gray-400",
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
