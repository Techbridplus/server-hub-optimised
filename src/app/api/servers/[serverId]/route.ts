import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter, isServerAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"


// GET /api/servers/[serverId] - Get server details
export async function GET(_req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      const { serverId } = await params
      const userId = session.user.id

      // First check if the server exists
      const serverExists = await prisma.server.findUnique({
        where: { id: serverId },
        select: { id: true }
      })

      if (!serverExists) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 })
      }

      // Get server basic info without announcements
      const serverBasic = await prisma.server.findUnique({
        where: {
          id: serverId,
        },
        include: {
          members: {
            where: {
              userId: userId,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
          events: {
            where: {
              OR: [
                { startDate: { gte: new Date() } }, // Upcoming events
              ],
            },
            orderBy: [
              { startDate: 'asc' }, // Sort upcoming events by startDate ascending
            ],
          },
          groups: {
            include: {
              members: {
                where: {
                  userId: userId,
                },
                select: {
                  role: true,
                },
              },
            },
          },
        },
      })

      // Fetch only 3 past events directly from the database
      const pastEvents = await prisma.event.findMany({
        where: {
          serverId: serverId,
          endDate: { lt: new Date() }, // Past events
        },
        orderBy: {
          endDate: 'desc', // Sort past events by endDate descending (newest first)
        },
        take: 3, // Limit to 3 past events
      })

      // Combine upcoming and past events
      if (serverBasic) {
        serverBasic.events = [...serverBasic.events, ...pastEvents]
      }

      if (!serverBasic) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 })
      }

      // Get announcements separately with error handling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let announcements: any[] = []
      try {
        // Get all announcements for the server
        const allAnnouncements = await prisma.announcement.findMany({
          where: {
            serverId,
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
        
        // Filter out announcements with null authorId
        const validAnnouncements = allAnnouncements.filter((a: { authorId: string | null }) => a.authorId)
        
        // Get author information for valid announcements
        if (validAnnouncements.length > 0) {
          const authorIds = validAnnouncements.map((a: { authorId: string }) => a.authorId)
          const authors = await prisma.user.findMany({
            where: {
              id: {
                in: authorIds
              }
            },
            select: {
              id: true,
              name: true,
              image: true
            }
          })
          
          // Create a map of author IDs to author objects
          const authorMap = new Map(authors.map((a: { id: string }) => [a.id, a]))
          
          // Combine announcements with author information
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          announcements = validAnnouncements.map((a: any) => ({
            ...a,
            author: authorMap.get(a.authorId) || null
          }))
        }
      } catch (error) {
        console.error("Error fetching announcements:", error)
        // Continue with empty announcements array
      }

      // Combine the data
      const server = {
        ...serverBasic,
        announcements
      }

      return NextResponse.json(server)
    } catch (error) {
      console.error("Error fetching server:", error)
      return NextResponse.json({ error: "Failed to fetch server" }, { status: 500 })
    }
  })
}

// PUT /api/servers/[serverId] - Update server
export async function PUT(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      // Ensure params is properly awaited
      const { serverId } = await params
      const { name, description, category, isPrivate, isExclusive, accessKey, imageUrl, bannerUrl, tags } =
        await req.json()

      // Check if user is server admin
      const isAdmin = await isServerAdmin(session.user.id, serverId)
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      // Update server
      const server = await prisma.server.update({
        where: {
          id: serverId,
        },
        data: {
          name,
          description,
          category,
          isPrivate,
          isExclusive,
          accessKey: isPrivate ? accessKey : null,
          imageUrl,
          bannerUrl,
        },
      })

      // Update tags if provided
      if (tags) {
        // Delete existing tags
        await prisma.serverTag.deleteMany({
          where: {
            serverId,
          },
        })

        // Create new tags
        await prisma.serverTag.createMany({
          data: tags.map((tag: string) => ({
            name: tag,
            serverId,
          })),
        })
      }

      return NextResponse.json(server)
    } catch (error) {
      console.error("Error updating server:", error)
      return NextResponse.json({ error: "Failed to update server" }, { status: 500 })
    }
  })
}

// DELETE /api/servers/[serverId] - Delete server
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
  return authMiddlewareAppRouter(async (session) => {
    try {
      // Ensure params is properly awaited
      const { serverId } = await params

      // Check if user is server admin
      const isAdmin = await isServerAdmin(session.user.id, serverId)
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      // Delete server
      await prisma.server.delete({
        where: {
          id: serverId,
        },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Error deleting server:", error)
      return NextResponse.json({ error: "Failed to delete server" }, { status: 500 })
    }
  })
}

