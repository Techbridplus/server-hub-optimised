import { authenticator } from "otplib"
import { transporter, emailTemplates } from "./email-config"
import dns from "dns"
import { promisify } from "util"

const resolveMx = promisify(dns.resolveMx)

interface VerificationData {
  otp: string
  attempts: number
  expiresAt: number
}

const verificationStore = new Map<string, VerificationData>()
const MAX_ATTEMPTS = 3
const OTP_EXPIRY = 10 * 60 * 1000 // 10 minutes

export async function sendVerificationEmail(email: string) {
  try {
    // Generate OTP
    const otp = authenticator.generateSecret().slice(0, 6)
    
    // Store OTP with metadata
    verificationStore.set(email, {
      otp,
      attempts: 0,
      expiresAt: Date.now() + OTP_EXPIRY
    })

    // Send email using Nodemailer
    await transporter.sendMail({
      from: process.env.gmail,
      to: email,
      ...emailTemplates.verification(otp)
    })

    return { success: true }
  } catch (error) {
    console.error("[SEND_VERIFICATION_EMAIL]", error)
    return { success: false, error: "Failed to send verification email" }
  }
}

export async function verifyEmail(email: string, otp: string) {
  const data = verificationStore.get(email)
  
  if (!data) {
    return { success: false, error: "No verification in progress" }
  }

  if (Date.now() > data.expiresAt) {
    verificationStore.delete(email)
    return { success: false, error: "Verification code has expired" }
  }

  if (data.attempts >= MAX_ATTEMPTS) {
    verificationStore.delete(email)
    return { success: false, error: "Too many attempts. Please request a new code." }
  }

  data.attempts++

  if (data.otp !== otp) {
    return { success: false, error: "Invalid verification code" }
  }

  verificationStore.delete(email)
  return { success: true }
}

export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1]
    const mxRecords = await resolveMx(domain)
    return mxRecords && mxRecords.length > 0
  } catch (error) {
    console.error("[CHECK_EMAIL_EXISTS]", error)
    return false
  }
} 