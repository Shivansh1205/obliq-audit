import type { DocumentStatus, Role } from "@/lib/generated/prisma/enums";
import { approve, requestCorrection, startReview, upload } from "./actions";

// Which controls make sense for this role at this status. The server actions
// re-check the role independently; this only decides what to draw.
export function Controls({
  documentId,
  status,
  role,
}: {
  documentId: string;
  status: DocumentStatus;
  role: Role;
}) {
  if (role === "STAFF") {
    const needsUpload = status === "PENDING" || status === "CORRECTION_REQUIRED";
    if (!needsUpload) return null;

    return (
      <form action={upload.bind(null, documentId)} className="card actions">
        <label htmlFor="fileName">
          {status === "CORRECTION_REQUIRED" ? "Upload a revised file" : "Upload a file"}
        </label>
        <input
          id="fileName"
          name="fileName"
          placeholder="Bank_Statement.pdf"
          required
          defaultValue=""
        />
        <input
          type="hidden"
          name="isRevision"
          value={String(status === "CORRECTION_REQUIRED")}
        />
        <button type="submit" className="primary">
          Upload
        </button>
      </form>
    );
  }

  if (status === "UPLOADED") {
    return (
      <form action={startReview.bind(null, documentId)} className="card actions">
        <button type="submit" className="primary">
          Start review
        </button>
      </form>
    );
  }

  if (status === "UNDER_REVIEW") {
    return (
      <div className="card actions">
        <form action={requestCorrection.bind(null, documentId)} className="stack">
          <label htmlFor="reason">Request a correction</label>
          <textarea
            id="reason"
            name="reason"
            rows={2}
            required
            placeholder="Page 3 is missing. Please upload the complete bank statement."
          />
          <button type="submit">Request correction</button>
        </form>
        <form action={approve.bind(null, documentId)}>
          <button type="submit" className="primary">
            Approve
          </button>
        </form>
      </div>
    );
  }

  return null;
}
