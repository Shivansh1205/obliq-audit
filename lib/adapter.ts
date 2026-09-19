import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

// The schema's provider is postgresql, so a missing DATABASE_URL must not
// silently fall back to SQLite: that produced an adapter/provider mismatch
// at build time rather than a readable error.
export function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  return url.startsWith("postgres")
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });
}
