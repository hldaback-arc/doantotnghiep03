import { PrismaClient } from "@prisma/client";

/* Reuses one Prisma connection pool across development hot reloads. */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/* Keeps the generated SQL Server client singleton stable in dev and production. */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
