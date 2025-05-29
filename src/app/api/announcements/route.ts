import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/announcements - Get all announcements
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("serverId")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    const where = serverId ? { serverId } : {}

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.announcement.count({ where }),
    ])

    return NextResponse.json({
      announcements,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 })
  }
}

// POST /api/announcements - Create a new announcement
export async function POST(req: NextRequest) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { title, content, isImportant, serverId } = await req.json()

      // Check if user is server member with appropriate permissions
      const serverMember = await prisma.serverMember.findFirst({
        where: {
          userId: session.user.id,
          serverId,
          role: {
            in: ["ADMIN", "MODERATOR"],
          },
        },
      })

      if (!serverMember) {
        return NextResponse.json(
          { error: "You must be an admin or moderator to create announcements" },
          { status: 403 }
        )
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          isImportant: isImportant || false,
          serverId,
          authorId: session.user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      })

      return NextResponse.json(announcement)
    } catch (error) {
      console.error("Error creating announcement:", error)
      return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 })
    }
  })
} 