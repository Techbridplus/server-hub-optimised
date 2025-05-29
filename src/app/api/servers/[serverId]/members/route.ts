import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/servers/[serverId]/members - Get server members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const { serverId } = await params
    
    // Check if user is a member of the server
    const serverMember = await prisma.serverMember.findFirst({
      where: {
        serverId,
        userId: session.user.id
      }
    })
    
    if (!serverMember) {
      return NextResponse.json({ error: "Not a member of this server" }, { status: 403 })
    }
    
    // Get members with their user information and status
    const members = await prisma.serverMember.findMany({
      where: {
        serverId: serverId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    const userIds = members.map(m => m.userId);
    const statuses = await prisma.userStatus.findMany({
      where: { userId: { in: userIds } }
    });
    const statusMap = Object.fromEntries(statuses.map(s => [s.userId, s]));

    // Format the response
    const formattedMembers = members.map(member => {
      const status = statusMap[member.userId];
      return {
        ...member,
        user: {
          ...member.user,
          status: status?.status || "offline",
          lastSeen: status?.lastSeen || member.joinedAt
        }
      }
    });

    return NextResponse.json(formattedMembers)
  } catch (error) {
    console.error("Error fetching server members:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
// POST /api/servers/[serverId]/members - Check if a user is a member of the server

export async function POST(req: NextRequest) {
  try {
    const { userId, serverId } = await req.json();

    // Validate input
    if (!userId || !serverId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or serverId" },
        { status: 400 }
      );
    }

    // Check if the user is a member of the server
    const serverMember = await prisma.serverMember.findFirst({
      where: {
        userId,
        serverId,
      }
    });

    if (serverMember) {
      return NextResponse.json({ success: true, isMember: true });
    } else {
      return NextResponse.json({ success: true, isMember: false });
    }
  } catch (error) {
    console.error("Error checking server membership:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

