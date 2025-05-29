import { NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/groups/[groupId]/leave - Leave a group
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { groupId } =  await params

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
        },
      })

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 })
      }

      // Check if user is a member of the group
      if (group.members.length === 0) {
        return NextResponse.json(
          { error: "You are not a member of this group" },
          { status: 400 }
        )
      }

      // Remove user from group
      await prisma.groupMember.delete({
        where: {
          id: group.members[0].id,
        },
      })

      return NextResponse.json({
        message: "Successfully left the group",
      })
    } catch (error) {
      console.error("Error leaving group:", error)
      return NextResponse.json(
        { error: "Failed to leave group" },
        { status: 500 }
      )
    }
  })
} 