import "dotenv/config";

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { createAdapter } from "../lib/adapter";

// Demonstrates the tenant boundary at the query level: the same lookups the
// DAL performs, run with the wrong firmId, return nothing.
const prisma = new PrismaClient({
  adapter: createAdapter(),
});

let failures = 0;

function check(name: string, pass: boolean) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) failures++;
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return entry === "route.ts" || entry === "route.tsx" ? [path] : [];
  });
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

  // An undefined firmId is not a narrow filter, it is no filter: Prisma drops
  // the condition and returns every firm's rows. lib/session.ts rejects a
  // malformed payload so undefined can never reach a query, and this records
  // why that check exists.
  check(
    "an undefined firmId would leak across firms (guarded in session.ts)",
    (await prisma.client.findMany({ where: { firmId: undefined } })).length >
      (await prisma.client.findMany({ where: { firmId: xyz.id } })).length,
  );

  // Staff see only assigned clients. This narrows within a firm; it must
  // never be the only scope, or a staff member assigned to a client in
  // another firm would see it.
  const abcStaff = await prisma.user.findFirstOrThrow({
    where: { role: "STAFF", firmId: abc.id },
    include: { assignedClients: true },
  });
  const unassigned = await prisma.client.findFirst({
    where: { firmId: abc.id, assignees: { none: { id: abcStaff.id } } },
  });
  check(
    "staff see fewer clients than their firm has",
    abcStaff.assignedClients.length <
      (await prisma.client.count({ where: { firmId: abc.id } })),
  );
  check(
    "staff cannot read an unassigned client in their own firm",
    unassigned !== null &&
      (await prisma.client.findFirst({
        where: {
          id: unassigned.id,
          firmId: abc.id,
          assignees: { some: { id: abcStaff.id } },
        },
      })) === null,
  );

  // No route handlers: this app talks to the database through Server
  // Components and Server Actions only. A stray debug endpoint that mints
  // sessions or reads unscoped data would show up here.
  const routes = routeFiles("app");
  check(
    routes.length === 0 ? "no route handlers in app/" : `unexpected route handlers: ${routes}`,
    routes.length === 0,
  );

  console.log(failures === 0 ? "\nAll isolation checks passed." : `\n${failures} failed.`);
}

main()
  .finally(() => prisma.$disconnect())
  .then(() => process.exit(failures === 0 ? 0 : 1));
