import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter, isServerAdmin } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/servers/[serverId]/cancel-deletion - Cancel scheduled server deletion
export async function POST(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      // Ensure params is properly awaited
      const { serverId } = await params
      const { deletionId } = await req.json()

      // Check if user is server admin
      const isAdmin = await isServerAdmin(session.user.id, serverId)
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      // Find and delete the scheduled deletion
      const scheduledDeletion = await prisma.scheduledDeletion.findUnique({
        where: {
          id: deletionId,
          serverId,
        },
      })

      if (!scheduledDeletion) {
        return NextResponse.json({ error: "Scheduled deletion not found" }, { status: 404 })
      }

      // Delete the scheduled deletion
      await prisma.scheduledDeletion.delete({
        where: {
          id: deletionId,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error cancelling server deletion:", error)
      return NextResponse.json({ error: "Failed to cancel server deletion" }, { status: 500 })
    }
  })
} 