import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/servers/[serverId]/leave - Leave a server
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const resolvedParams = await params
      const { serverId } = resolvedParams

      // Check if server exists
      const server = await prisma.server.findUnique({
        where: {
          id: serverId,
        },
        select: {
          ownerId: true,
        },
      })

      if (!server) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 })
      }

      // Check if user is the server owner
      if (server.ownerId === session.user.id) {
        return NextResponse.json({ error: "Server owner cannot leave the server" }, { status: 400 })
      }

      // Check if user is a member
      const membership = await prisma.serverMember.findFirst({
        where: {
            userId: session.user.id,
            serverId,
        },
      })

      if (!membership) {
        return NextResponse.json({ error: "You are not a member of this server" }, { status: 400 })
      }

      // Leave server
      await prisma.serverMember.deleteMany({
        where: {
            userId: session.user.id,
            serverId,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error leaving server:", error)
      return NextResponse.json({ error: "Failed to leave server" }, { status: 500 })
    }
  })
}

