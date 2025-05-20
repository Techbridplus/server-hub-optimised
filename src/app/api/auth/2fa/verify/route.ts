import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PrismaClient } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { authenticator } from "otplib"

const prisma = new PrismaClient()

const verifySchema = z.object({
  code: z.string().min(6),
  secret: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()

    // Validate request body
    const validation = verifySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.format() }, { status: 400 })
    }

    const { code, secret } = validation.data

    // Verify the TOTP code
    const isValid = authenticator.verify({
      token: code,
      secret: secret,
    })

    if (!isValid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }

    // Enable 2FA for the user
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        enabled: true,
      },
    })

    return NextResponse.json({
      message: "Two-factor authentication enabled successfully",
    })
  } catch (error) {
    console.error("2FA verification error:", error)
    return NextResponse.json({ error: "An error occurred during 2FA verification" }, { status: 500 })
  }
}

