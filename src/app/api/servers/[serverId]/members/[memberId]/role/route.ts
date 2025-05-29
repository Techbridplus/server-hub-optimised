import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { serverId, memberId } = await params
    const { role } = await req.json()
    
    // Check if the current user is an admin of the server
    const currentUserMember = await prisma.serverMember.findFirst({
      where: {
        serverId,
        userId: session.user.id
      }
    })
    
    if (!currentUserMember || currentUserMember.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can change member roles" },
        { status: 403 }
      )
    }
    
    // Check if the target member exists
    const targetMember = await prisma.serverMember.findUnique({
      where: {
        id: memberId
      }
    })
    
    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }
    
    // Prevent changing admin roles
    if (targetMember.role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot change admin roles" },
        { status: 403 }
      )
    }
    
    // Update the member's role
    const updatedMember = await prisma.serverMember.update({
      where: {
        id: memberId
      },
      data: {
        role: role === "moderator" ? "MODERATOR" : "MEMBER"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })
    
    return NextResponse.json(updatedMember)
  } catch (error) {
    console.error("Error updating member role:", error)
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    )
  }
} 