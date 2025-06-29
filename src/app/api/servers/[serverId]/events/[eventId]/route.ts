import { NextRequest, NextResponse } from "next/server"
// import { getServerSession } from "next-auth"
// import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authMiddlewareAppRouter } from "@/lib/auth"
// import { use } from "react"

// GET /api/servers/[serverId]/events/[eventId] - Get event details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serverId: string; eventId: string }> }
) {
  return authMiddlewareAppRouter( async (session) => {
    console.log(session)
    try {
      const { serverId, eventId } = await params;

      const event = await prisma.event.findUnique({
        where: {
          id: eventId,
          serverId: serverId,
        },
        include: {
          server: true,
          photos: true,
          videos: true,
          comments: true
        },
      });

      if (!event) {
        return NextResponse.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }

      const userData = await prisma.user.findUnique({
        where: {
          id: event.userId,
        },
        select: {
          id: true,
          name: true,
          image: true,
        }
      });
      if (!userData) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      const eventWithUser = {
        ...event,
        organizer:{
          id: userData.id,
          name: userData.name,
          image: userData.image,
        }
      }

      return NextResponse.json(eventWithUser);
    } catch (error) {
      console.error("Error fetching event:", error);
      return NextResponse.json(
        { error: "Failed to fetch event" },
        { status: 500 }
      );
    }
  });
}