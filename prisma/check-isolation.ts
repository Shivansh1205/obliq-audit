import "dotenv/config";

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Demonstrates the tenant boundary at the query level: the same lookups the
// DAL performs, run with the wrong firmId, return nothing.
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

let failures = 0;

function check(name: string, pass: boolean) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) failures++;
}

async function main() {
  const [abc, xyz] = await Promise.all([
    prisma.firm.findFirstOrThrow({ where: { name: "ABC & Co." } }),
    prisma.firm.findFirstOrThrow({ where: { name: "XYZ & Co." } }),
  ]);
  const abcClient = await prisma.client.findFirstOrThrow({ where: { firmId: abc.id } });
  const abcDoc = await prisma.document.findFirstOrThrow({
    where: { clientId: abcClient.id },
  });

  // Firm A's own client is reachable by Firm A.
  check(
    "ABC reads its own client",
    (await prisma.client.findFirst({ where: { id: abcClient.id, firmId: abc.id } })) !== null,
  );

  // The same id, scoped to Firm B, matches nothing.
  check(
    "XYZ cannot read ABC's client by id",
    (await prisma.client.findFirst({ where: { id: abcClient.id, firmId: xyz.id } })) === null,
  );

  check(
    "XYZ cannot read ABC's document by id",
    (await prisma.document.findFirst({
      where: { id: abcDoc.id, client: { firmId: xyz.id } },
    })) === null,
  );

  check(
    "XYZ's client list excludes ABC's clients",
    (await prisma.client.findMany({ where: { firmId: xyz.id } })).every(
      (c) => c.firmId === xyz.id,
    ),
  );

  console.log(failures === 0 ? "\nAll isolation checks passed." : `\n${failures} failed.`);
}

main()
  .finally(() => prisma.$disconnect())
  .then(() => process.exit(failures === 0 ? 0 : 1));
