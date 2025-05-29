import { NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { MemberRole } from "../../../../../../generated/prisma"
import { prisma } from "@/lib/prisma"

// POST /api/groups/[groupId]/join - Join a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { groupId } = await params
      const { serverId } = await request.json()

      if (!serverId) {
        return NextResponse.json(
          { error: "Server ID is required" },
          { status: 400 }
        )
      }

      // Check if group exists
      const group = await prisma.group.findUnique({
        where: {
          id: groupId,
        },
        include: {
          members: {
            where: {
              userId: session.user.id,
            },
          },
          server: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 })
      }

      // Check if group belongs to the specified server
      if (group.serverId !== serverId) {
        return NextResponse.json(
          { error: "Group does not belong to the specified server" },
          { status: 400 }
        )
      }

      // Check if user is already a member
      if (group.members.length > 0) {
        return NextResponse.json(
          { error: "You are already a member of this group" },
          { status: 400 }
        )
      }

      // Check if group is private
      if (group.isPrivate) {
        return NextResponse.json(
          { error: "This is a private group. You need an invitation to join" },
          { status: 403 }
        )
      }

      // Add user to group as a member
      const groupMember = await prisma.groupMember.create({
        data: {
          userId: session.user.id,
          groupId: groupId,
          role: MemberRole.MEMBER,
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

      return NextResponse.json({
        message: "Successfully joined the group",
        member: groupMember,
      })
    } catch (error) {
      console.error("Error joining group:", error)
      return NextResponse.json(
        { error: "Failed to join group" },
        { status: 500 }
      )
    }
  })
} 