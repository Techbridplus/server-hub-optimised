import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import prisma from "@/lib/prisma"
export async function GET(_req: NextRequest, { params }: { params: Promise<{ serverId: string }>}) {
    return authMiddlewareAppRouter(async (session) => {
        const { serverId } = await Promise.resolve(params)
        const userId = session.user.id
        try {
            const serverMember = await prisma.serverMember.findFirst({
              where: {
                userId: userId,
                serverId: serverId,
              },
              select: {
                role: true
              }
            });
            
            if (!serverMember) {
              return NextResponse.json({ error: "User is not a member of this server" }, { status: 403 });
            }
            
            return NextResponse.json({ role: serverMember.role });
          } catch (error) {
            console.error("Error fetching user role:", error);
            return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 })
        }
    })
}