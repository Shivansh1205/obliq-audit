import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { readSession, type Session } from "./session";

// The tenant boundary. Every function below scopes its query by
// session.firmId, so a caller cannot widen the scope by passing an id from
// another firm: the row simply does not match and the caller gets null.
//
// Route-level checks are not the boundary. This is.

export const requireSession = cache(async (): Promise<Session> => {
  const session = await readSession();
  if (!session) redirect("/login");
  return session;
});

// Staff see only their assigned clients; reviewers see the whole firm. This
// narrows within a firm — it never widens across one, because firmId is
// still applied alongside it.
export function visibleTo(session: Session) {
  return session.role === "STAFF"
    ? { firmId: session.firmId, assignees: { some: { id: session.userId } } }
    : { firmId: session.firmId };
}

export async function listClients() {
  const session = await requireSession();
  return prisma.client.findMany({ where: visibleTo(session), orderBy: { name: "asc" } });
}

export async function getClient(clientId: string) {
  const session = await requireSession();
  return prisma.client.findFirst({
    where: { id: clientId, ...visibleTo(session) },
    include: { documents: { orderBy: { name: "asc" } } },
  });
}

export async function getDocument(documentId: string) {
  const session = await requireSession();
  return prisma.document.findFirst({
    where: { id: documentId, client: visibleTo(session) },
    include: { client: true, uploadedBy: true },
  });
}

export async function listEvents(documentId: string) {
  const { firmId } = await requireSession();
  return prisma.auditEvent.findMany({
    where: { documentId, firmId },
    include: { actor: true },
    orderBy: { createdAt: "asc" },
  });
}
