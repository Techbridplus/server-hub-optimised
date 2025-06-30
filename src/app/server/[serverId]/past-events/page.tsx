"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PastEventCard } from "@/components/past-event-card"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Event } from "../../../../../generated/prisma"
import { useParams } from "next/navigation"
export default function PastEventsPage() {
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("date-desc")
  const [filterBy, setFilterBy] = useState("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const params = useParams();
  const serverId = params.serverId as string

  const fetchEvents = useCallback(async (pageNum: number, isLoadMore = false) => {
    try {
      const response = await fetch(
        `/api/servers/${serverId}/events/past?page=${pageNum}&search=${searchQuery}&sort=${sortBy}&filter=${filterBy}`
      )
      if (!response.ok) throw new Error("Failed to fetch events")
      const data = await response.json()
      
      if (isLoadMore) {
        setEvents(prev => [...prev, ...data.events])
      } else {
        setEvents(data.events)
      }
      setHasMore(data.hasMore)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load past events. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [serverId, searchQuery, sortBy, filterBy, toast])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchEvents(1)
  }, [fetchEvents])

  const handleLoadMore = () => {
    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    fetchEvents(nextPage, true)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSort = (value: string) => {
    setSortBy(value)
  }

  const handleFilter = (value: string) => {
    setFilterBy(value)
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

        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold sm:text-3xl">Past Events</h1>
          <Button asChild>
            <Link href={`/server/${serverId}#events`}>View Upcoming Events</Link>
          </Button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search past events..." 
              className="pl-9"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <Select value={sortBy} onValueChange={handleSort}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest first)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest first)</SelectItem>
              <SelectItem value="attendees-desc">Attendees (Most first)</SelectItem>
              <SelectItem value="attendees-asc">Attendees (Least first)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBy} onValueChange={handleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="exclusive">Exclusive only</SelectItem>
              <SelectItem value="public">Public only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="mb-6" />

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[200px] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No past events found.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} href={`/server/${serverId}/event/${event.id}`}>
                  <PastEventCard event={event} serverId={serverId} />
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button 
                  variant="outline" 
                  className="gap-1"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"} <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

