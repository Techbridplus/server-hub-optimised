import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/servers/[serverId]/events/[eventId]/videos - Get event videos
export async function GET(req: NextRequest, { params }: { params: Promise<{ serverId: string; eventId: string }> }) {
  try {
    const { serverId, eventId } = await params
    const { searchParams } = new URL(req.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "12")
    const skip = (page - 1) * limit

    // Get videos with pagination
    const videos = await prisma.eventVideo.findMany({
      where: {
        eventId,
        event: {
          serverId,
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
      skip,
      take: limit,
    })

    // Get total count for pagination
    const total = await prisma.eventVideo.count({
      where: {
        eventId,
        event: {
          serverId,
        },
      },
    })

    return NextResponse.json({
      videos,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}

// POST /api/servers/[serverId]/events/[eventId]/videos - Upload a video
export async function POST(req: NextRequest, { params }: { params: Promise<{ serverId: string; eventId: string }> }) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { serverId, eventId } = await params
      const { url, caption } = await req.json()

      // Check if user is server member
      const serverMember = await prisma.serverMember.findFirst({
        where: {
          userId: session.user.id,
          serverId,
        },
      })

      if (!serverMember) {
        return NextResponse.json({ error: "You must be a member to upload videos" }, { status: 403 })
      }

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: {
          id: eventId,
          serverId,
        },
      })

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }

      // Create video
      const video = await prisma.eventVideo.create({
        data: {
          url,
          caption,
          uploadedBy: session.user.id,
          eventId,
        },
      })

      return NextResponse.json(video)
    } catch (error) {
      console.error("Error uploading video:", error)
      return NextResponse.json({ error: "Failed to upload video" }, { status: 500 })
    }
  })
}

