import { NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type ServerWhereInput = {
  ownerId?: string
  members?: {
    some: {
      userId: string
    }
  }
  OR?: Array<{
    ownerId?: string
    members?: {
      some: {
        userId: string
      }
    }
  }>
}

// GET /api/users/me/servers - Get current user's servers
export async function GET(req: NextRequest) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { searchParams } = new URL(req.url)
      const owned = searchParams.get("owned") === "true"
      const joined = searchParams.get("joined") === "true"
      const page = Number(searchParams.get("page") || "1")
      const limit = Number(searchParams.get("limit") || "10")
      const skip = (page - 1) * limit

      // Build the where clause based on query parameters
      const where: ServerWhereInput = {}

      if (owned) {
        where.ownerId = session.user.id
      } else if (joined) {
        where.members = {
          some: {
            userId: session.user.id,
          },
        }
      } else {
        // If no specific query, return both owned and joined servers
        where.OR = [
          { ownerId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ]
      }

      const [servers, total] = await Promise.all([
        prisma.server.findMany({
          where,
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                image: true,
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
        }),
        prisma.server.count({ where })
      ])

      return NextResponse.json({
        servers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Error fetching user servers:", error)
      return NextResponse.json({ error: "Failed to fetch servers" }, { status: 500 })
    }
  })
}
