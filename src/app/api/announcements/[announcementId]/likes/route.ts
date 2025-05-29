import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/announcements/[announcementId]/likes - Get likes for an announcement
export async function GET(req: NextRequest, { params }: { params: Promise<{ announcementId: string }> }) {
  const {announcementId} = await params
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    const [count, userLiked] = await Promise.all([
      prisma.like.count({
        where: { announcementId: announcementId },
      }),
      userId
        ? prisma.like.findUnique({
            where: {
              userId_announcementId: {
                userId,
                announcementId: announcementId,
              },
            },
          })
        : null,
    ])

    return NextResponse.json({
      count,
      userLiked: !!userLiked,
    })
  } catch (error) {
    console.error("Error fetching likes:", error)
    return NextResponse.json({ error: "Failed to fetch likes" }, { status: 500 })
  }
}

// POST /api/announcements/[announcementId]/likes - Toggle like on an announcement
export async function POST(_req: NextRequest, { params }: { params: Promise<{ announcementId: string }> }) {
  const {announcementId} = await params
  return authMiddlewareAppRouter(async (session) => {
    try {
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_announcementId: {
            userId: session.user.id,
            announcementId: announcementId,
          },
        },
      })

      if (existingLike) {
        await prisma.like.delete({
          where: {
            userId_announcementId: {
              userId: session.user.id,
              announcementId: announcementId,
            },
          },
        })
      } else {
        await prisma.like.create({
          data: {
            userId: session.user.id,
            announcementId: announcementId,
          },
        })
      }

      const count = await prisma.like.count({
        where: { announcementId: announcementId },
      })

      return NextResponse.json({
        liked: !existingLike,
        count,
      })
    } catch (error) {
      console.error("Error toggling like:", error)
      return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 })
    }
  })
} 