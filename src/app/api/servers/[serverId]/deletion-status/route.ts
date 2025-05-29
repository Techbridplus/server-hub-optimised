import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter, isServerAdmin } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/servers/[serverId]/deletion-status - Check status of scheduled server deletion
export async function GET(_req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      // Ensure params is properly awaited
      const { serverId } = await params

      // Check if user is server admin
      const isAdmin = await isServerAdmin(session.user.id, serverId)
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      // Find the scheduled deletion for this server
      const scheduledDeletion = await prisma.scheduledDeletion.findFirst({
        where: {
          serverId,
        },
        orderBy: {
          scheduledFor: 'desc',
        },
      })

      if (!scheduledDeletion) {
        return NextResponse.json({ isScheduled: false })
      }

      // Calculate remaining time in seconds
      const now = new Date()
      const scheduledFor = new Date(scheduledDeletion.scheduledFor)
      const remainingSeconds = Math.max(0, Math.floor((scheduledFor.getTime() - now.getTime()) / 1000))

      return NextResponse.json({ 
        isScheduled: true,
        deletionId: scheduledDeletion.id,
        scheduledFor: scheduledDeletion.scheduledFor,
        remainingSeconds,
      })
    } catch (error) {
      console.error("Error checking deletion status:", error)
      return NextResponse.json({ error: "Failed to check deletion status" }, { status: 500 })
    }
  })
} 