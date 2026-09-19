import "server-only";

import { PrismaClient } from "./generated/prisma/client";
import { createAdapter } from "./adapter";

// Cached across dev hot reloads; without this each reload opens a new pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client() {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const created = new PrismaClient({ adapter: createAdapter() });
  globalForPrisma.prisma = created;
  return created;
}

// Constructed on first use rather than on import: the build imports this
// module while collecting page data, before DATABASE_URL is necessarily
// available, and connecting there would fail the build instead of the
// request that actually needs a database.
export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, property) => Reflect.get(client(), property),
});
