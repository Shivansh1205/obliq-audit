"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/db";

const REQUIRED_DOCUMENTS = [
  "Bank Statement",
  "Sales Register",
  "Purchase Register",
  "GST Return",
  "Expense Summary",
];

// firmId comes from the session, so a client can only ever be created inside
// the caller's own firm. The creator is assigned to it, otherwise a staff
// member would immediately lose sight of what they just made.
export async function createClient(formData: FormData) {
  const session = await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("A client name is required");

  await prisma.client.create({
    data: {
      name,
      firmId: session.firmId,
      assignees: { connect: { id: session.userId } },
      documents: { create: REQUIRED_DOCUMENTS.map((doc) => ({ name: doc })) },
    },
  });

  revalidatePath("/clients");
}
