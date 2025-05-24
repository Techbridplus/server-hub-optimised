import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notifications);
}

export async function POST(req: Request) {
  const body = await req.json();
  const newNotification = await prisma.notification.create({
    data: {
      userId: body.userId,
      message: body.message,
      heading: body.heading,
      type: body.type || 'info',
    },
  });
  return NextResponse.json(newNotification);
}
