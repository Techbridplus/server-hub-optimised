import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    serverId: string
    groupId: string
    channelId: string
  }>
}

// GET /api/servers/[serverId]/groups/[groupId]/channels/[channelId]/messages - Get channel messages
export async function GET(
  
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    const { serverId, channelId } = await params
    // Check if user is a member of the server
    const serverMember = await prisma.serverMember.findFirst({
      where: {
        serverId,
        userId: session.user.id,
      },
    })

    if (!serverMember) {
      return new NextResponse("Not a member of this server", { status: 403 })
    }

    // Get messages for the channel
    const messages = await prisma.message.findMany({
      where: {
        channelId,
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
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[MESSAGES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// POST /api/servers/[serverId]/groups/[groupId]/channels/[channelId]/messages - Send a message
export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    const { serverId, groupId, channelId } = await params
    const { content } = await req.json()
    if (!content) {
      return new NextResponse("Content is required", { status: 400 })
    }

    // Check if user is a member of the server
    const serverMember = await prisma.serverMember.findFirst({
      where: {
        serverId,
        userId: session.user.id,
      },
    })

    if (!serverMember) {
      return new NextResponse("Not a member of this server", { status: 403 })
    }

    // Check if channel exists and belongs to the group
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        groupId,
        group: {
          serverId,
        },
      },
    })

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 })
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        userId: session.user.id,
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

    return NextResponse.json(message)
  } catch (error) {
    console.error("[MESSAGES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

