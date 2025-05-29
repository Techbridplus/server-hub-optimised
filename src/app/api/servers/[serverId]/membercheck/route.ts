import { type NextRequest, NextResponse } from "next/server"
import { authMiddlewareAppRouter } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(_req : NextRequest,{ params }: { params: Promise<{ groupId: string }> }) {
    const {groupId} = await params

    if (!groupId) {
        console.error("groupId is undefined");
        return NextResponse.json(
            { success: false, error: "Missing groupId in request parameters" },
            { status: 400 }
        );
    }

    return authMiddlewareAppRouter(async (session) => {
        const userId = session.user.id;

        // Validate input
        if (!userId || !groupId) {
            return NextResponse.json(
                { success: false, error: "Missing userId or groupId" },
                { status: 400 }
            );
        }

        try {
            // Fetch the group member's role
            const groupMember = await prisma.groupMember.findFirst({
                where: {
                    userId,
                    groupId,
                },
                select: {
                    role: true, // Fetch only the role field
                },
            });

            if (!groupMember) {
                return NextResponse.json({groupMember: null}, { status: 404 });
            }

            return NextResponse.json(groupMember);
        } catch (error) {
            console.error("Error fetching user role:", error);
            return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
        }
    });
}

export async function POST(_req : NextRequest,{ params }:{ params: Promise<{ groupId: string }> }) {

    const {groupId} = await params

    if (!groupId) {
        console.error("groupId is undefined");
        return NextResponse.json(
            { success: false, error: "Missing groupId in request parameters" },
            { status: 400 }
        );
    }

    return authMiddlewareAppRouter(async (session) => {
        const userId = session.user.id;

        // Validate input
        if (!userId || !groupId) {
            return NextResponse.json(
                { success: false, error: "Missing userId or groupId" },
                { status: 400 }
            );
        }

        try {
            // Check if user is a member of the group
            const groupMember = await prisma.groupMember.findFirst({
                where: {
                    userId,
                    groupId,
                },
            });

            // Return success if user is a member of the group
            return NextResponse.json({ 
                success: true, 
                isMember: !!groupMember,
                role: groupMember?.role || null
            });
        } catch (error) {
            console.error("Error checking group membership:", error);
            return NextResponse.json({ error: "Failed to check membership" }, { status: 500 });
        }
    });
}