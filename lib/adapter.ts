import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

// The schema's provider is postgresql, so a missing DATABASE_URL must not
// silently fall back to SQLite: that produced an adapter/provider mismatch
// at build time rather than a readable error.
export function createAdapter() {
  // Vercel's Postgres integration injects PRISMA_DATABASE_URL / POSTGRES_URL
  // rather than DATABASE_URL, so accept either instead of requiring the
  // variable to be duplicated by hand.
  const url =
    process.env.DATABASE_URL ??
    process.env.PRISMA_DATABASE_URL ??
    process.env.POSTGRES_URL;
  if (!url) throw new Error("No database URL set (DATABASE_URL)");

  // Prisma Postgres hands out prisma+postgres:// URLs, which the plain pg
  // driver cannot parse.
  if (url.startsWith("prisma+postgres://") || url.startsWith("prisma://")) {
    return new PrismaPostgresAdapter({ connectionString: url });
  }

  return url.startsWith("postgres")
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });
}
