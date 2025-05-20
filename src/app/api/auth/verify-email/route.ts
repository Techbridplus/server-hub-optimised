import { NextRequest, NextResponse } from "next/server"
import { sendVerificationEmail, verifyEmail, checkEmailExists } from "@/lib/email-verification"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    // If OTP is provided, verify it
    if (otp) {
      const result = await verifyEmail(email, otp)
      return NextResponse.json(result)
    }

    // If no OTP, check if email exists and send verification
    const emailExists = await checkEmailExists(email)
    if (!emailExists) {
      return NextResponse.json(
        { success: false, error: "Email domain does not exist" },
        { status: 404 }
      )
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    const result = await sendVerificationEmail(email)
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("[VERIFY_EMAIL]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 