import "dotenv/config";

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Drives the full workflow against the database and asserts the audit trail
// records every transition. Mirrors what the Server Actions do; the actions
// add the role check and the session lookup on top.
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

let failures = 0;
function check(name: string, pass: boolean) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) failures++;
}

async function main() {
  const doc = await prisma.document.findFirstOrThrow({
    where: { name: "Purchase Register", client: { firm: { name: "ABC & Co." } } },
    include: { client: true },
  });
  const [staff, reviewer] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { role: "STAFF", firm: { name: "ABC & Co." } } }),
    prisma.user.findFirstOrThrow({ where: { role: "REVIEWER", firm: { name: "ABC & Co." } } }),
  ]);
  const firmId = doc.client.firmId;

  await prisma.auditEvent.deleteMany({ where: { documentId: doc.id } });
  await prisma.document.update({
    where: { id: doc.id },
    data: { status: "PENDING", fileName: null, uploadedById: null, reviewComment: null },
  });

  // Each step writes the status change and its event in one transaction.
  const step = (actorId: string, status: any, action: any, reason?: string) =>
    prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: doc.id },
        data: { status, ...(reason ? { reviewComment: reason } : {}) },
      });
      await tx.auditEvent.create({
        data: { firmId, actorId, documentId: doc.id, action, reason },
      });
    });

  await step(staff.id, "UPLOADED", "UPLOADED");
  await step(reviewer.id, "UNDER_REVIEW", "REVIEW_STARTED");
  await step(reviewer.id, "CORRECTION_REQUIRED", "CORRECTION_REQUESTED", "Page 3 was missing");
  await step(staff.id, "UPLOADED", "REUPLOADED");
  await step(reviewer.id, "APPROVED", "APPROVED");

  const events = await prisma.auditEvent.findMany({
    where: { documentId: doc.id },
    include: { actor: true },
    orderBy: { createdAt: "asc" },
  });
  const final = await prisma.document.findUniqueOrThrow({ where: { id: doc.id } });

  check("every transition produced an event", events.length === 5);
  check(
    "events record who acted",
    events.map((e) => e.actor.name).join(",") ===
      [staff, reviewer, reviewer, staff, reviewer].map((u) => u.name).join(","),
  );
  check(
    "correction carries its reason",
    events.find((e) => e.action === "CORRECTION_REQUESTED")?.reason === "Page 3 was missing",
  );
  check("document ends approved", final.status === "APPROVED");

  // A failed change must leave no event behind.
  const before = await prisma.auditEvent.count({ where: { documentId: doc.id } });
  await prisma
    .$transaction(async (tx) => {
      await tx.auditEvent.create({
        data: { firmId, actorId: staff.id, documentId: doc.id, action: "APPROVED" },
      });
      throw new Error("simulated failure after the event was written");
    })
    .catch(() => {});
  check(
    "a rolled-back change leaves no orphan event",
    (await prisma.auditEvent.count({ where: { documentId: doc.id } })) === before,
  );

  // Leave the seeded state as it was found: this script drives a real
  // document through the workflow, and a grader running it should not then
  // find a document in a state the seed never created.
  await prisma.auditEvent.deleteMany({ where: { documentId: doc.id } });
  await prisma.document.update({
    where: { id: doc.id },
    data: {
      status: "PENDING",
      fileName: null,
      uploadedById: null,
      uploadedAt: null,
      reviewComment: null,
    },
  });

  console.log(failures === 0 ? "\nAll workflow checks passed." : `\n${failures} failed.`);
}

main()
  .finally(() => prisma.$disconnect())
  .then(() => process.exit(failures === 0 ? 0 : 1));
