import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/announcements/[announcementId] - Get a single announcement
export async function GET(_req: NextRequest, { params }: { params: Promise<{ announcementId: string }> }) {

  const { announcementId } = await params

  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id:announcementId },
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

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    return NextResponse.json(announcement)
  } catch (error) {
    console.error("Error fetching announcement:", error)
    return NextResponse.json({ error: "Failed to fetch announcement" }, { status: 500 })
  }
}

// PATCH /api/announcements/[announcementId] - Update an announcement
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ announcementId: string }> }) {

  const {announcementId} = await params

  return authMiddlewareAppRouter(async (session) => {
    try {
      const { title, content, isImportant } = await req.json()

      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          server: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!announcement) {
        return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
      }

      // Check if user is the author or has appropriate permissions
      const serverMember = await prisma.serverMember.findFirst({
        where: {
          userId: session.user.id,
          serverId: announcement.serverId,
          role: {
            in: ["ADMIN", "MODERATOR"],
          },
        },
      })

      if (announcement.authorId !== session.user.id && !serverMember) {
        return NextResponse.json(
          { error: "You don't have permission to update this announcement" },
          { status: 403 }
        )
      }

      const updatedAnnouncement = await prisma.announcement.update({
        where: { id:announcementId },
        data: {
          title,
          content,
          isImportant,
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

      return NextResponse.json(updatedAnnouncement)
    } catch (error) {
      console.error("Error updating announcement:", error)
      return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 })
    }
  })
}

// DELETE /api/announcements/[announcementId] - Delete an announcement
export async function DELETE(_req: NextRequest,{ params }: { params: Promise<{ announcementId: string }> }) {

  const {announcementId} = await params

  return authMiddlewareAppRouter(async (session) => {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id:announcementId },
        include: {
          server: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!announcement) {
        return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
      }

      // Check if user is the author or has appropriate permissions
      const serverMember = await prisma.serverMember.findFirst({
        where: {
          userId: session.user.id,
          serverId: announcement.serverId,
          role: {
            in: ["ADMIN", "MODERATOR"],
          },
        },
      })

      if (announcement.authorId !== session.user.id && !serverMember) {
        return NextResponse.json(
          { error: "You don't have permission to delete this announcement" },
          { status: 403 }
        )
      }

      await prisma.announcement.delete({
        where: { id:announcementId },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error deleting announcement:", error)
      return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 })
    }
  })
} 