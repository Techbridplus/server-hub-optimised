import { NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface PaginatedResponse {
  servers: any[]
  categories: { name: string; count: number }[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

// GET /api/servers - Get servers with categories and pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const featured = searchParams.get("featured") === "true"
    const includePrivate = searchParams.get("includePrivate") === "true"
    const page = Number(searchParams.get("page") || "1")
    const limit = Number(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {}

    if (!includePrivate) {
      where.isPrivate = false // Only show public servers by default
    }

    if (category && category !== "all") {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (featured) {
      where.isFeatured = true
    }

    // Get all unique categories with their counts in parallel with servers
    const [servers, categories] = await Promise.all([
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
      // Get unique categories with counts
      prisma.server.groupBy({
        by: ['category'],
        _count: {
          category: true,
        },
        orderBy: {
          category: 'asc',
        },
      }),
    ])

    // Get total count for pagination
    const total = await prisma.server.count({ where })

    // Format categories
    const formattedCategories = categories.map((cat: { category: string; _count: { category: number } }) => ({
      name: cat.category,
      count: cat._count.category,
    }))

    return NextResponse.json({
      servers,
      categories: formattedCategories,
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
  return authMiddlewareAppRouter( async (session) => {
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

