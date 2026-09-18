import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocument } from "@/lib/dal";
import { STATUS_LABEL } from "@/lib/status";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  return (
    <main className="page">
      <Link href={`/clients/${doc.clientId}`} className="muted">
        ← {doc.client.name}
      </Link>
      <h1>{doc.name}</h1>
      <span className={`badge status-${doc.status}`}>{STATUS_LABEL[doc.status]}</span>

      <dl className="card">
        <dt className="muted">Client</dt>
        <dd>{doc.client.name}</dd>
        <dt className="muted">Uploaded by</dt>
        <dd>{doc.uploadedBy?.name ?? "—"}</dd>
        <dt className="muted">Uploaded at</dt>
        <dd>{doc.uploadedAt?.toLocaleString() ?? "—"}</dd>
        <dt className="muted">Review comment</dt>
        <dd>{doc.reviewComment ?? "—"}</dd>
      </dl>
    </main>
  );
}
