import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __cachedPrisma: PrismaClient
}

let prisma: PrismaClient
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!global.__cachedPrisma) {
    global.__cachedPrisma = new PrismaClient()
  }
  prisma = global.__cachedPrisma
}

export { prisma }

