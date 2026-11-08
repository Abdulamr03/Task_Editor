import { PrismaClient } from "@prisma/client";

// Reuse one database client during development, so hot reload
// doesn't open a new connection on every change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
