import "server-only";

import { PrismaClient } from "./generated/prisma/client";
import { createAdapter } from "./adapter";

// Cached across dev hot reloads; without this each reload opens a new pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
