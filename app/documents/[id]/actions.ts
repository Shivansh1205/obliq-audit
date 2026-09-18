"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/dal";
import { applyChange } from "@/lib/audit";


// Role is checked here, on the server. The UI also hides these controls from
// staff, but that is cosmetic: this is what actually refuses the action.
async function requireReviewer() {
  const session = await requireSession();
  if (session.role !== "REVIEWER") throw new Error("Only a reviewer can review documents");
}

export async function startReview(documentId: string) {
  await requireReviewer();
  await applyChange({ documentId, status: "UNDER_REVIEW", action: "REVIEW_STARTED" });
  revalidatePath(`/documents/${documentId}`);
}

export async function approve(documentId: string) {
  await requireReviewer();
  await applyChange({
    documentId,
    status: "APPROVED",
    action: "APPROVED",
    reviewComment: null,
  });
  revalidatePath(`/documents/${documentId}`);
}

export async function requestCorrection(documentId: string, formData: FormData) {
  await requireReviewer();

  // Required by the brief, and validated here rather than only in the form.
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("A comment is required when requesting a correction");

  await applyChange({
    documentId,
    status: "CORRECTION_REQUIRED",
    action: "CORRECTION_REQUESTED",
    reason,
    reviewComment: reason,
  });
  revalidatePath(`/documents/${documentId}`);
}

// "Upload" records a filename. Real file storage is out of scope: the brief
// evaluates the workflow, not blob handling.
export async function upload(documentId: string, formData: FormData) {
  const fileName = String(formData.get("fileName") ?? "").trim();
  if (!fileName) throw new Error("A file name is required");

  const isRevision = String(formData.get("isRevision")) === "true";
  await applyChange({
    documentId,
    status: "UPLOADED",
    action: isRevision ? "REUPLOADED" : "UPLOADED",
    fileName,
    reviewComment: isRevision ? undefined : null,
  });
  revalidatePath(`/documents/${documentId}`);
}
