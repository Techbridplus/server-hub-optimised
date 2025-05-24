import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface ServerCategory {
  category: string
  _count: {
    members: number
  }
}

interface CategoryInfo {
  name: string
  count: number
}

// GET /api/categories - Get all unique categories with their server counts
export async function GET() {
  try {
    // Get all servers to extract unique categories
    const servers = await prisma.server.findMany({
      select: {
        category: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    }) as ServerCategory[]

    // Create a map to store unique categories and their counts
    const categoryMap = new Map<string, CategoryInfo>()

    // Process each server to count categories
    servers.forEach((server: ServerCategory) => {
      const currentCount = categoryMap.get(server.category)?.count || 0
      categoryMap.set(server.category, {
        name: server.category,
        count: currentCount + 1,
      })
    })

    // Convert map to array and sort by name
    const categories = Array.from(categoryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    )

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}
