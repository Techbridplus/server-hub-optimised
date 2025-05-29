import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authMiddlewareAppRouter, isServerAdmin } from "@/lib/auth"

// PUT /api/servers/[serverId]/members/[memberId] - Update member role
export async function PUT(
  req: NextRequest,
  {params}: { params: Promise<{ serverId: string; memberId: string }> }
) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { serverId, memberId } = await params
      const { role } = await req.json()

      // Check if user is server admin
      const isAdmin = await isServerAdmin(session.user.id, serverId)
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      // Get the member to check if they're the server owner
      const member = await prisma.serverMember.findUnique({
        where: {
          id: memberId
        },
        include: {
          server: {
            select: {
              ownerId: true
            }
          }
        }
      })

      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 })
      }

      // Check if target user is server owner
      if (member.server.ownerId === member.userId) {
        return NextResponse.json({ error: "Cannot change role of server owner" }, { status: 400 })
      }

      // Update member role
      const updatedMember = await prisma.serverMember.update({
        where: {
          id: memberId
        },
        data: {
          role,
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

      return NextResponse.json(updatedMember)
    } catch (error) {
      console.error("Error updating member role:", error)
      return NextResponse.json({ error: "Failed to update member role" }, { status: 500 })
    }
  })
}

// DELETE /api/servers/[serverId]/members/[memberId] - Remove member from server
export async function DELETE(
  _req: NextRequest,
  {params}: { params: Promise<{ serverId: string; memberId: string }> }
) {


  return authMiddlewareAppRouter(async (session) => {
    try {

      const { serverId, memberId } = await params
      // Check if user is server admin
      const isAdmin = await isServerAdmin(session.user.id, serverId)
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      // Get the member to check if they're the server owner
      const member = await prisma.serverMember.findUnique({
        where: {
          id: memberId
        },
        include: {
          server: {
            select: {
              ownerId: true
            }
          }
        }
      })

      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 })
      }

      // Check if target user is server owner
      if (member.server.ownerId === member.userId) {
        return NextResponse.json({ error: "Cannot remove server owner" }, { status: 400 })
      }

      // Remove member
      await prisma.serverMember.delete({
        where: {
          id: memberId
        }
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error removing member:", error)
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
    }
  })
} 