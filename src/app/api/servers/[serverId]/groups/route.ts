import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MemberRole } from "../../../../../../generated/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
// GET /api/servers/[serverId]/groups - Get server groups
export async function GET(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { serverId } = await params
    const { searchParams } = new URL(req.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // Get groups with pagination
    const groups = await prisma.group.findMany({
      where: {
        serverId,
      },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    })

    // Get total count for pagination
    const total = await prisma.group.count({
      where: {
        serverId,
      },
    })

    return NextResponse.json({
      groups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching groups:", error)
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 })
  }
}

// POST /api/servers/[serverId]/groups - Create a new group
export async function POST(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      // Ensure params is properly awaited
      const { serverId } = await params

      // Check if user has permission to create groups
      const serverMember = await prisma.serverMember.findFirst({
        where: {
          userId: session.user.id,
          serverId,
        },
        select: {
          role: true,
        },
      })

      if (!serverMember || (serverMember.role !== MemberRole.ADMIN && serverMember.role !== MemberRole.MODERATOR)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      const { name, description, imageUrl, isPrivate } = await req.json()

      // Create group and add creator as admin in a transaction
      const group = await prisma.$transaction(async (tx) => {
        // Create the group
        const newGroup = await tx.group.create({
          data: {
            name,
            description,
            imageUrl,
            isPrivate,
            serverId,
          },
        })

        // Add creator as admin
        await tx.groupMember.create({
          data: {
            userId: session.user.id,
            groupId: newGroup.id,
            role: serverMember.role,
          },
        })

        return newGroup
      })

      return NextResponse.json(group)
    } catch (error) {
      console.error("Error creating group:", error)
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
    }
  })
}

