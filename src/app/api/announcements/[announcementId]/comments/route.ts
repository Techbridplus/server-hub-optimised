import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/announcements/[announcementId]/comments - Get comments for an announcement
export async function GET(req: NextRequest, { params }: { params: Promise<{ announcementId: string }> }) {
  const {announcementId} = await params
  try {
    const { searchParams } = new URL(req.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { announcementId: announcementId },
        include: {
          user: {
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
      prisma.comment.count({
        where: { announcementId: announcementId },
      }),
    ])

    return NextResponse.json({
      comments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

// POST /api/announcements/[announcementId]/comments - Create a new comment
export async function POST(req: NextRequest,{ params }: { params: Promise<{ announcementId: string }> }) {
  const {announcementId} = await params
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { content } = await req.json()

      // Check if announcement exists
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
      })

      if (!announcement) {
        return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
      }

      // Check if user is a member of the server
      const serverMember = await prisma.serverMember.findFirst({
        where: {
          userId: session.user.id,
          serverId: announcement.serverId,
        },
      })

      if (!serverMember) {
        return NextResponse.json(
          { error: "You must be a server member to comment" },
          { status: 403 }
        )
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          userId: session.user.id,
          announcementId: announcementId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      })

      return NextResponse.json({ comment })
    } catch (error) {
      console.error("Error creating comment:", error)
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
    }
  })
} 