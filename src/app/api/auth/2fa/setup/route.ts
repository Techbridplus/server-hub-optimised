import {  NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PrismaClient } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import crypto from "crypto"
import qrcode from "qrcode"
import { authenticator } from "otplib"

const prisma = new PrismaClient()

// Generate a random string for 2FA secret
function generateSecret() {
  // Generate a random secret and encode it in base32
  const secret = authenticator.generateSecret()
  return secret
}

// Generate backup codes
function generateBackupCodes(count = 10) {
  const codes = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString("hex"))
  }
  return codes
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Generate a new secret
    const secret = generateSecret()

    // Generate backup codes
    const backupCodes = generateBackupCodes()

    // Check if user already has 2FA setup
    const existingSetup = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    })

    if (existingSetup) {
      // Update existing setup
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          secret,
          backupCodes,
          enabled: false, // Will be enabled after verification
        },
      })
    } else {
      // Create new setup
      await prisma.twoFactorAuth.create({
        data: {
          userId,
          secret,
          backupCodes,
          enabled: false,
        },
      })
    }

    // Generate QR code with proper TOTP URI format
    const otpauth = `otpauth://totp/ServerHub:${session.user.email}?secret=${secret}&issuer=ServerHub`
    
    // Generate QR code as SVG for better quality
    const qrCode = await qrcode.toString(otpauth, {
      type: 'svg',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })

    return NextResponse.json({
      secret,
      qrCode,
      backupCodes,
    })
  } catch (error) {
    console.error("2FA setup error:", error)
    return NextResponse.json({ error: "An error occurred during 2FA setup" }, { status: 500 })
  }
}

