import "server-only";

import { prisma } from "./db";
import { requireSession } from "./dal";
import type { DocumentStatus } from "./generated/prisma/enums";

// What each role is expected to act on next. Staff chase their own
// outstanding uploads; reviewers chase work that has landed in their queue.
const NEEDS_ACTION: Record<"STAFF" | "REVIEWER", DocumentStatus[]> = {
  STAFF: ["PENDING", "CORRECTION_REQUIRED"],
  REVIEWER: ["UPLOADED", "UNDER_REVIEW"],
};

export async function listActionable() {
  const session = await requireSession();
  return prisma.document.findMany({
    where: {
      client: { firmId: session.firmId },
      status: { in: NEEDS_ACTION[session.role] },
    },
    include: { client: true },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });
}
