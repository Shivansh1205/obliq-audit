import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/dal";
import { STATUS_LABEL } from "@/lib/status";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Scoped to the session's firm inside the DAL: another firm's id is not
  // forbidden here, it simply does not exist.
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <main className="page">
      <Link href="/clients" replace className="muted back">
        ← Clients
      </Link>
      <h1>{client.name}</h1>

      <h2>Audit documents</h2>
      <ul className="list">
        {client.documents.map((doc) => (
          <li key={doc.id}>
            <Link href={`/documents/${doc.id}`} className="row-button">
              <span>{doc.name}</span>
              <span className={`badge status-${doc.status}`}>{STATUS_LABEL[doc.status]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
