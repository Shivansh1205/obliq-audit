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
  });
  return firm;
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

  const firms = await prisma.firm.findMany({ include: { users: true, clients: true } });
  for (const firm of firms) {
    console.log(
      `${firm.name}: ${firm.users.map((u) => `${u.name} (${u.role})`).join(", ")} | ` +
        `${firm.clients.length} client(s)`,
    );
  }
}

main().finally(() => prisma.$disconnect());
