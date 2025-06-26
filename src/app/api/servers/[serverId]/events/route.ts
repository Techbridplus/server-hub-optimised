import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter,  } from "@/lib/auth"
import { prisma } from "@/lib/prisma" // Import prisma

// GET /api/servers/[serverId]/events - Get server events
export async function GET(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  
  try {
    // Ensure params is properly awaited
    const { serverId } = await params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "upcoming" // upcoming, past, all
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    const now = new Date()

    // Build filter conditions
    const where: {
      serverId: string;
      startDate?: { gte: Date };
      endDate?: { lt: Date };
    } = {
      serverId,
    }

    if (type === "upcoming") {
      where.startDate = {
        gte: now,
      }
    } else if (type === "past") {
      where.endDate = {
        lt: now,
      }
    }

    // Get events with pagination
    const events = await prisma.event.findMany({
      where,
      include: {
        // organizer: {
        //   select: {
        //     id: true,
        //     name: true,
        //     image: true,
        //   },
        // },
        _count: {
          select: {
            photos: true,
            videos: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        startDate: "asc",
      },
    })

    // Get total count for pagination
    const total = await prisma.event.count({
      where,
    })

    // Format response based on type
    let response
    if (type === "all") {
      response = {
        events,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    } else {
      // For upcoming and past, we'll return a more structured response
      const upcoming = type === "upcoming" ? events : []
      const past = type === "past" ? events : []

      response = {
        upcoming,
        past,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

// POST /api/servers/[serverId]/events - Create a new event
export async function POST(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      // Ensure params is properly awaited
      const { serverId } = await params
      const userId = session.user.id

      // Check if user has permission to create events
      const serverMember = await prisma.serverMember.findFirst({
        where: {
          userId,
          serverId,
        },
        select: {
          role: true,
        },
      })

      if (!serverMember || (serverMember.role !== "ADMIN" && serverMember.role !== "MODERATOR")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      const {
        title,
        description,
        startDate,
        endDate,
        location,
        imageUrl,
        isExclusive,
      } = await req.json()

      // Create event
      const event = await prisma.event.create({
        data: {
          title,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          location,
          imageUrl,
          isExclusive,
          serverId,
          userId : userId,
        },
      })

      return NextResponse.json(event)
    } catch (error) {
      console.error("Error creating event:", error)
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
    }
  })
}

