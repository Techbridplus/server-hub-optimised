import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { MemberRole } from "../../../../../generated/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await params

    // Fetch group with channels and members
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      include: {
        channels: {
          orderBy: {
            createdAt: "asc",
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
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

    // Check if user is a member of the group
    const isMember = group.members.some((member: { userId: string; user: { id: string; name: string | null; image: string | null } }) => member.userId === session.user.id)
    if (!isMember && group.isPrivate) {
      return NextResponse.json({ error: "You don't have access to this group" }, { status: 403 })
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error("Error fetching group:", error)
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    )
  }
}

// PATCH /api/groups/[groupId] - Update group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { groupId } =  await params
      const { name, description, imageUrl, isPrivate } = await request.json()

      // Check if group exists and get member role
      const group = await prisma.group.findUnique({
        where: {
          id: groupId,
        },
        include: {
          members: {
            where: {
              userId: session.user.id,
            },
            select: {
              role: true,
            },
          },
        },
      })

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 })
      }

      // Check if user is a member and has admin role
      const member = group.members[0]
      if (!member || member.role !== MemberRole.ADMIN) {
        return NextResponse.json({ error: "Only group admins can update the group" }, { status: 403 })
      }

      // Update group
      const updatedGroup = await prisma.group.update({
        where: {
          id: groupId,
        },
        data: {
          name,
          description,
          imageUrl,
          isPrivate,
        },
      })

      return NextResponse.json(updatedGroup)
    } catch (error) {
      console.error("Error updating group:", error)
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 })
    }
  })
}

// DELETE /api/groups/[groupId] - Delete group
export async function DELETE(
  _req : NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { groupId } = await params

      // Check if group exists and get member role
      const group = await prisma.group.findUnique({
        where: {
          id: groupId,
        },
        include: {
          members: {
            where: {
              userId: session.user.id,
            },
            select: {
              role: true,
            },
          },
          server: {
            select: {
              id: true,
              ownerId: true,
            },
          },
        },
      })

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 })
      }
      // Check if user is a group admin or server owner
      const member = group.members[0]
      const isServerOwner = group.server.ownerId === session.user.id
      const canDelete = (member?.role === MemberRole.ADMIN || MemberRole.MODERATOR) || isServerOwner
      
      if (!canDelete) {
        return NextResponse.json(
          { error: "Only group admins or server owners can delete the group" },
          { status: 403 }
        )
      }

      // Delete group
      await prisma.group.delete({
        where: {
          id: groupId,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error deleting group:", error)
      return NextResponse.json({ error: "Failed to delete group" }, { status: 500 })
    }
  })
} 