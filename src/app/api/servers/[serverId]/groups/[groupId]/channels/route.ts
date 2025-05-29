import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/servers/[serverId]/groups/[groupId]/channels - Get group channels
export async function GET(_req: NextRequest, { params }: { params: Promise<{ serverId: string; groupId: string }> }) {
  try {
      const {serverId,groupId } = await params

    if (!serverId || !groupId) {
      return NextResponse.json({ error: "Server ID and Group ID are required" }, { status: 400 })
    }

    // Get channels
    const channels = await prisma.channel.findMany({
      where: {
        groupId,
        group: {
          serverId,
        },
      },
      orderBy: [
        { type: "asc" }, // Text channels first, then voice
        { name: "asc" }, // Alphabetical by name
      ],
    })

    return NextResponse.json(channels)
  } catch (error) {
    console.error("Error fetching channels:", error)
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
  }
}

// POST /api/servers/[serverId]/groups/[groupId]/channels - Create a new channel
export async function POST(req: NextRequest, { params }: { params: Promise<{ serverId: string; groupId: string }> }) {
  return authMiddlewareAppRouter(async ( session) => {
    try {
      const { serverId, groupId } = await params

      if (!serverId || !groupId) {
        return NextResponse.json({ error: "Server ID and Group ID are required" }, { status: 400 })
      }

      const { name, type } = await req.json()

      // Check if user is group admin
      const groupMember = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: session.user.id,
          role: "ADMIN",
        },
      })

      if (!groupMember) {
        return NextResponse.json({ error: "Only group admins can create channels" }, { status: 403 })
      }

      // Validate required fields
      if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 })
      }

      // Create channel
      const channel = await prisma.channel.create({
        data: {
          name,
          type: type || "text",
          group: {
            connect: {
              id: groupId,
            },
          },
        },
      })

      return NextResponse.json(channel)
    } catch (error) {
      console.error("Error creating channel:", error)
      return NextResponse.json({ error: "Failed to create channel" }, { status: 500 })
    }
  })
}

