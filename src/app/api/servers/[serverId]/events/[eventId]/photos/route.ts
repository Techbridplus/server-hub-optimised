import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/servers/[serverId]/events/[eventId]/photos - Get event photos
export async function GET(req: NextRequest, { params }: { params: Promise<{ serverId: string; eventId: string }> }) {
  try {
    const { serverId, eventId } = await params
    const { searchParams } = new URL(req.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "12")
    const skip = (page - 1) * limit

    // Get photos with pagination
    const photos = await prisma.eventPhoto.findMany({
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
    const total = await prisma.eventPhoto.count({
      where: {
        eventId,
        event: {
          serverId,
        },
      },
    })

    return NextResponse.json({
      photos,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching photos:", error)
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 })
  }
}

// POST /api/servers/[serverId]/events/[eventId]/photos - Upload a photo
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
        return NextResponse.json({ error: "You must be a member to upload photos" }, { status: 403 })
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

      // Create photo
      const photo = await prisma.eventPhoto.create({
        data: {
          url,
          caption,
          uploadedBy: session.user.id,
          eventId,
        },
      })

      return NextResponse.json(photo)
    } catch (error) {
      console.error("Error uploading photo:", error)
      return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 })
    }
  })
}

