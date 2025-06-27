import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter, isServerAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/servers/[serverId]/schedule-deletion - Schedule server deletion
export async function POST(req: NextRequest, { params }: { params: Promise<{ serverId: string }>}) {
  return authMiddlewareAppRouter(async ( session) => {
    try {
      // Ensure params is properly awaited
      const { serverId } = await params
      const { delayMinutes } = await req.json()

      // Check if user is server admin
      const isAdmin = await isServerAdmin(session.user.id, serverId)
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
      
      // Calculate the deletion time
      const deletionTime = new Date(Date.now() + delayMinutes * 60 * 1000)
      
      // Store the scheduled deletion in the database
      const scheduledDeletion = await prisma.scheduledDeletion.create({
        data: {
          serverId,
          scheduledFor: deletionTime,
          userId: session.user.id,
        },
      })

      return NextResponse.json({ 
        success: true, 
        deletionId: scheduledDeletion.id,
        scheduledFor: scheduledDeletion.scheduledFor
      })
    } catch (error) {
      console.error("Error scheduling server deletion:", error)
      return NextResponse.json({ error: "Failed to schedule server deletion" }, { status: 500 })
    }
  })
} 