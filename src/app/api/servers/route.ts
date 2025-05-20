import { NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import { prisma } from "@/lib/prisma"



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

