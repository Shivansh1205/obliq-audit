import "dotenv/config";

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

const REQUIRED_DOCUMENTS = [
  "Bank Statement",
  "Sales Register",
  "Purchase Register",
  "GST Return",
  "Expense Summary",
];

async function seedFirm(
  name: string,
  staff: string,
  reviewer: string,
  clients: string[],
) {
  const firm = await prisma.firm.create({
    data: {
      name,
      users: {
        create: [
          { name: staff, role: "STAFF" },
          { name: reviewer, role: "REVIEWER" },
        ],
      },
      clients: {
        create: clients.map((client) => ({
          name: client,
          documents: { create: REQUIRED_DOCUMENTS.map((doc) => ({ name: doc })) },
        })),
      },
    },
    include: { users: true, clients: true },
  });

  // Assign the staff member to every client except the last, so the
  // difference between "assigned to you" and "in your firm" is visible.
  const staffUser = firm.users.find((u) => u.role === "STAFF")!;
  const assigned = firm.clients.length > 1 ? firm.clients.slice(0, -1) : firm.clients;
  await prisma.user.update({
    where: { id: staffUser.id },
    data: { assignedClients: { connect: assigned.map((c) => ({ id: c.id })) } },
  });

  return firm;
}

// Replays the worked example from the brief on one document, so the audit
// history is populated on a fresh checkout.
async function seedHistory(firmName: string, clientName: string) {
  const [staff, reviewer] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { role: "STAFF", firm: { name: firmName } } }),
    prisma.user.findFirstOrThrow({ where: { role: "REVIEWER", firm: { name: firmName } } }),
  ]);
  const doc = await prisma.document.findFirstOrThrow({
    where: { name: "Bank Statement", client: { name: clientName } },
    include: { client: true },
  });

  const at = (minutes: number) => new Date(Date.now() - (90 - minutes) * 60_000);
  const firmId = doc.client.firmId;

  const steps = [
    { actorId: staff.id, action: "UPLOADED" as const, reason: null, createdAt: at(0) },
    { actorId: reviewer.id, action: "REVIEW_STARTED" as const, reason: null, createdAt: at(11) },
    {
      actorId: reviewer.id,
      action: "CORRECTION_REQUESTED" as const,
      reason: "Page 3 is missing. Please upload the complete bank statement.",
      createdAt: at(14),
    },
    { actorId: staff.id, action: "REUPLOADED" as const, reason: null, createdAt: at(45) },
    { actorId: reviewer.id, action: "APPROVED" as const, reason: null, createdAt: at(52) },
  ];

  await prisma.auditEvent.createMany({
    data: steps.map((step) => ({ ...step, firmId, documentId: doc.id })),
  });

  await prisma.document.update({
    where: { id: doc.id },
    data: {
      status: "APPROVED",
      fileName: "Bank_Statement.pdf",
      uploadedById: staff.id,
      uploadedAt: at(45),
      reviewComment: "Page 3 is missing. Please upload the complete bank statement.",
    },
  });
}

async function main() {
  // Order matters: children before parents.
  await prisma.auditEvent.deleteMany();
  await prisma.document.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();

  await seedFirm("ABC & Co.", "Rohit", "Aman", ["ABC Traders Pvt. Ltd.", "Sunrise Foods"]);
  await seedFirm("XYZ & Co.", "Priya", "Karan", ["Meridian Textiles"]);

  await seedHistory("ABC & Co.", "ABC Traders Pvt. Ltd.");

  const firms = await prisma.firm.findMany({ include: { users: true, clients: true } });
  for (const firm of firms) {
    console.log(
      `${firm.name}: ${firm.users.map((u) => `${u.name} (${u.role})`).join(", ")} | ` +
        `${firm.clients.length} client(s)`,
    );
  }
}

main().finally(() => prisma.$disconnect());
