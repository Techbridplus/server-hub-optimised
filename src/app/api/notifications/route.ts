import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddlewareAppRouter } from '@/lib/auth'

export async function GET() {
  return authMiddlewareAppRouter(async (session) => {
    try{
      const notifications = await prisma.notification.findMany({
        where:{
          userId: session.user.id,
        },
        orderBy: {createdAt: 'desc'},
      })
      return NextResponse.json(notifications);
    } catch(error){
      console.error('Error fetching notifications:', error);
      return NextResponse.json({error: 'Failed to fetch notifications'}, {status: 500});


    }
  })
}

export async function POST(req: Request) {
  const body = await req.json();
  const newNotification = await prisma.notification.create({
    data: Object.assign(
      {
        userId: body.userId,
        message: body.message,
        heading: body.heading,
      },
      body.link ? { link: body.link } : {}
    )
  });
  return NextResponse.json(newNotification);
}
