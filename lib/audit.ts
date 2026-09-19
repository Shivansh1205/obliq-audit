import "server-only";

import { prisma } from "./db";
import { requireSession, visibleTo } from "./dal";
import type { AuditAction, DocumentStatus } from "./generated/prisma/enums";

type Change = {
  documentId: string;
  status: DocumentStatus;
  action: AuditAction;
  reason?: string;
  // Set on upload; leaves the field untouched when omitted.
  fileName?: string;
  reviewComment?: string | null;
};

// The only path that changes a document. The status update and its audit
// event are written in one transaction, so a state change cannot exist
// without the event that explains it.
//
// The document is re-read inside the transaction with a firm-scoped filter:
// a caller from another firm updates zero rows and gets an error, rather
// than a silent no-op.
export async function applyChange(change: Change) {
  const session = await requireSession();

  return prisma.$transaction(async (tx) => {
    const document = await tx.document.findFirst({
      where: { id: change.documentId, client: visibleTo(session) },
      select: { id: true },
    });
    if (!document) throw new Error("Document not found in this firm");

    await tx.document.update({
      where: { id: document.id },
      data: {
        status: change.status,
        reviewComment: change.reviewComment,
        ...(change.fileName
          ? {
              fileName: change.fileName,
              uploadedById: session.userId,
              uploadedAt: new Date(),
            }
          : {}),
      },
    });

    await tx.auditEvent.create({
      data: {
        firmId: session.firmId,
        actorId: session.userId,
        documentId: document.id,
        action: change.action,
        reason: change.reason,
      },
    });
  });
}
