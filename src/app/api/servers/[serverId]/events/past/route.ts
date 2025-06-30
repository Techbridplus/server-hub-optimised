import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "../../../../../../../generated/prisma"


export async function GET(
  request: NextRequest,
  {params}:{params :Promise<{ serverId: string }>}
) {
  const { serverId } = await Promise.resolve(params)
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const search = searchParams.get("search") || ""
    const sort = searchParams.get("sort") || "date-desc"
    const filter = searchParams.get("filter") || "all"
    const limit = 9

    const skip = (page - 1) * limit

    // Build the where clause
    const where: Prisma.EventWhereInput = {
      serverId: serverId,
      endDate: {
        lt: new Date(), // Only past events
      },
      ...(search && {
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
      ...(filter === "exclusive" && { isExclusive: true }),
      ...(filter === "public" && { isExclusive: false }),
    }

    // Build the orderBy clause
    const orderBy: Prisma.EventOrderByWithRelationInput = (() => {
      switch (sort) {
        case "date-asc":
          return { startDate: Prisma.SortOrder.asc }
        case "date-desc":
          return { startDate: Prisma.SortOrder.desc }
        case "attendees-desc":
          return { attendees: { _count: Prisma.SortOrder.desc } }
        case "attendees-asc":
          return { attendees: { _count: Prisma.SortOrder.asc } }
        default:
          return { startDate: Prisma.SortOrder.desc }
      }
    })()

    // Fetch events with attendees count
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ])

    const hasMore = skip + events.length < total

    return NextResponse.json({
      events,
      hasMore,
      total,
    })
  } catch (error) {
    console.error("[PAST_EVENTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 