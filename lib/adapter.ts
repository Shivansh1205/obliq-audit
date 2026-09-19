import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

// One codebase, two databases: SQLite locally (a file, nothing to install)
// and Postgres in deployment, because a serverless filesystem is ephemeral
// and a SQLite file would not survive a cold start.
export function createAdapter() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  return url.startsWith("postgres")
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });
}
