import { NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "../../../../generated/prisma"

// GET /api/servers - Get servers with categories and pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const includePrivate = searchParams.get("includePrivate") === "true"
    const page = Number(searchParams.get("page") || "1")
    const limit = Number(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // Build filter conditions
    const where: Prisma.ServerWhereInput = {
      isPrivate: includePrivate ? undefined : false,
      category: category && category !== "all" ? category : undefined,
      OR: search ? [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ] : undefined
    }

    // Get all unique categories with their counts in parallel with servers
    const [servers] = await Promise.all([
      // Get servers with pagination
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
    ])

    // Get total count for pagination
    const total = await prisma.server.count({ where })

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
    console.error("Error fetching servers:", error)
    return NextResponse.json({ error: "Failed to fetch servers" }, { status: 500 })
  }
}

// POST /api/servers - Create a new server (protected route)
export async function POST(req: NextRequest) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const body = await req.json()
      const { name, description, category, isPrivate, imageUrl, bannerUrl } = body

      // Validate required fields
      if (!name) {
        return NextResponse.json({ error: "Server name is required" }, { status: 400 })
      }

      // Create the server
      const server = await prisma.server.create({
        data: {
          name,
          description,
          category,
          isPrivate,
          imageUrl,
          bannerUrl,
          ownerId: session.user.id,
          members: {
            create: {
              userId: session.user.id,
              role: "ADMIN",
            },
          },
        },
      })

      return NextResponse.json(server)
    } catch (error) {
      console.error("Error creating server:", error)
      return NextResponse.json({ error: "Failed to create server" }, { status: 500 })
    }
  })
}

