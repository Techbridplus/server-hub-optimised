import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/servers/[serverId]/join - Join a server
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const resolvedParams = await params
  
  return authMiddlewareAppRouter(async (session) => {
    try {
      let accessKey: string | undefined

      // Safely parse the request body
      try {
        const body = await request.json()
        accessKey = body?.accessKey
      } catch (error) {
        console.error("Error parsing request body:", error)
        accessKey = undefined
      }

      // Check if server exists
      const server = await prisma.server.findUnique({
        where: {
          id: resolvedParams.serverId,
        },
        select: {
          isPrivate: true,
          accessKey: true,
        },
      })

      if (!server) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 })
      }

      // Check if user is already a member
      const existingMembership = await prisma.serverMember.findFirst({
        where: {
          userId: session.user.id,
          serverId: resolvedParams.serverId,
        },
      })

      if (existingMembership) {
        return NextResponse.json({ error: "You are already a member of this server" }, { status: 400 })
      }

      // Check access key for private servers
      if (server.isPrivate) {
        if (!accessKey) {
          return NextResponse.json({ error: "Access key is required for private servers" }, { status: 403 })
        }
        if (server.accessKey !== accessKey) {
          return NextResponse.json({ error: "Invalid access key" }, { status: 403 })
        }
      }

      // Join server
      const membership = await prisma.serverMember.create({
        data: {
          userId: session.user.id,
          serverId: resolvedParams.serverId,
          role: "MEMBER",
        },
      })

      return NextResponse.json(membership)
    } catch (error) {
      console.error("Error joining server:", error)
      return NextResponse.json({ error: "Failed to join server" }, { status: 500 })
    }
  })
}

