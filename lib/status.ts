import type { DocumentStatus } from "./generated/prisma/enums";

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  PENDING: "Pending",
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  CORRECTION_REQUIRED: "Correction required",
};
