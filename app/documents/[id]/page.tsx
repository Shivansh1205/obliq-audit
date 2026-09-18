import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocument, listEvents, requireSession } from "@/lib/dal";
import { STATUS_LABEL } from "@/lib/status";
import { Controls } from "./controls";
import { Timeline } from "./timeline";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const [events, session] = await Promise.all([listEvents(doc.id), requireSession()]);

  return (
    <main className="page">
      <Link href={`/clients/${doc.clientId}`} className="muted">
        ← {doc.client.name}
      </Link>

      <div className="bar">
        <h1>{doc.name}</h1>
        <span className={`badge status-${doc.status}`}>{STATUS_LABEL[doc.status]}</span>
      </div>

      <dl className="card details">
        <div>
          <dt className="muted">Client</dt>
          <dd>{doc.client.name}</dd>
        </div>
        <div>
          <dt className="muted">File</dt>
          <dd>{doc.fileName ?? "—"}</dd>
        </div>
        <div>
          <dt className="muted">Uploaded by</dt>
          <dd>{doc.uploadedBy?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="muted">Uploaded at</dt>
          <dd>{doc.uploadedAt?.toLocaleString() ?? "—"}</dd>
        </div>
      </dl>

      {doc.reviewComment && (
        <div className="card note">
          <strong>Reviewer comment</strong>
          <p>{doc.reviewComment}</p>
        </div>
      )}

      <Controls documentId={doc.id} status={doc.status} role={session.role} />

      <h2>Audit history</h2>
      <Timeline events={events} documentName={doc.name} />
    </main>
  );
}
