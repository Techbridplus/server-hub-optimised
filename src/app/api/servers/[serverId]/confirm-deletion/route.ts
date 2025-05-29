import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter, isServerAdmin } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/servers/[serverId]/confirm-deletion - Confirm and execute scheduled server deletion
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

      // Find the scheduled deletion
      const scheduledDeletion = await prisma.scheduledDeletion.findUnique({
        where: {
          id: deletionId,
          serverId,
        },
      })

      if (!scheduledDeletion) {
        return NextResponse.json({ error: "Scheduled deletion not found" }, { status: 404 })
      }

      // Check if the scheduled deletion time has passed
      if (scheduledDeletion.scheduledFor > new Date()) {
        return NextResponse.json({ error: "Deletion time has not yet passed" }, { status: 400 })
      }

      // Delete the server members
      await prisma.serverMember.deleteMany({
        where: {
          serverId,
        },
      })

      // Delete the server
      await prisma.server.delete({
        where: {
          id: serverId,
        },
      })

      // Delete the scheduled deletion record
      await prisma.scheduledDeletion.delete({
        where: {
          id: deletionId,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error confirming server deletion:", error)
      return NextResponse.json({ error: "Failed to confirm server deletion" }, { status: 500 })
    }
  })
} 