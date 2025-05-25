import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
// import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { authenticator } from "otplib"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Session } from "next-auth"


// const prisma = new PrismaClient()
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "Two-Factor Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            twoFactorAuth: true,
          },
        })

        if (!user || !user.password) {
          throw new Error("User not found")
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error("Invalid password")
        }

        // Check if 2FA is enabled
        if (user.twoFactorAuth?.enabled) {
          if (!credentials.twoFactorCode) {
            throw new Error("2FA_REQUIRED")
          }

          // Verify the 2FA code
          const isValid = await verify2FACode(user.id, credentials.twoFactorCode)

          if (!isValid) {
            throw new Error("Invalid 2FA code")
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (existingUser) {
          // Check if the account is already linked
          const existingAccount = await prisma.account.findFirst({
            where: {
              userId: existingUser.id,
              provider: account.provider,
            },
          })

          if (!existingAccount) {
            // If account exists but not linked, link it
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            })
            // Update user with OAuth profile data
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
              },
            })
            // Set the user ID to the existing user's ID
            user.id = existingUser.id
          }
        }
      }
      return true
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper function to verify 2FA code
async function verify2FACode(userId: string, code: string): Promise<boolean> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: {
      userId,
    },
  })

  if (!twoFactorAuth) {
    return false
  }

  // First check if it's a backup code
  if (twoFactorAuth.backupCodes.includes(code)) {
    // Remove the used backup code
    await prisma.twoFactorAuth.update({
      where: {
        userId,
      },
      data: {
        backupCodes: twoFactorAuth.backupCodes.filter((c: string) => c !== code),
      },
    })
    return true
  }

  // If not a backup code, verify as TOTP
  return authenticator.verify({
    token: code,
    secret: twoFactorAuth.secret,
  })
}

type HandlerFunction = (session: Session) => Promise<NextResponse>;

export async function authMiddlewareAppRouter(handler: HandlerFunction) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return handler(session)
  } catch (error) {
    console.error("Auth middleware error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
export async function isServerAdmin(userId: string, serverId: string): Promise<boolean> {
  // Implement the logic to check if the user is a server admin
  // Example:
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { ownerId: true },
  });
  return server?.ownerId === userId;
}

export async function isServerMember(userId: string, serverId: string): Promise<boolean> {
  const member = await prisma.serverMember.findFirst({
    where: {
      userId,
      serverId,
    },
  });
  return !!member;
}

export async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  const member = await prisma.groupMember.findFirst({
    where: {
      userId,
      groupId,
      role: "ADMIN",
    },
  });
  return !!member;
}
