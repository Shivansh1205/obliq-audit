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
    if (status === "PENDING" || status === "CORRECTION_REQUIRED") {
      const isRevision = status === "CORRECTION_REQUIRED";
      return (
        <form action={upload.bind(null, documentId)} className="card actions">
          <div className="stack">
            <label htmlFor="fileName">
              {isRevision ? "Upload a revised file" : "Upload a file"}
            </label>
            <input id="fileName" name="fileName" placeholder="Bank_Statement.pdf" required />
          </div>
          <input type="hidden" name="isRevision" value={String(isRevision)} />
          <button type="submit" className="primary">
            {isRevision ? "Upload revision" : "Upload"}
          </button>
        </form>
      );
    }
    return (
      <p className="muted empty">
        {status === "APPROVED"
          ? "Approved. Nothing further needed."
          : "With the reviewer — nothing for you to do right now."}
      </p>
    );
  }

  // Reviewer. Approve and Request correction are both available as soon as a
  // document is uploaded: requiring "Start review" first would make the most
  // common action take two clicks.
  if (status === "UPLOADED" || status === "UNDER_REVIEW") {
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
        <div className="stack-right">
          {status === "UPLOADED" && (
            <form action={startReview.bind(null, documentId)}>
              <button type="submit">Mark under review</button>
            </form>
          )}
          <form action={approve.bind(null, documentId)}>
            <button type="submit" className="primary">
              Approve
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <p className="muted empty">
      {status === "APPROVED"
        ? "You approved this document."
        : "Waiting on the client to upload a revised file."}
    </p>
  );
}
