import Link from "next/link";
import { listClients, requireSession } from "@/lib/dal";
import { listActionable } from "@/lib/queue";
import { prisma } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/status";
import { logout } from "../login/actions";

export default async function ClientsPage() {
  const session = await requireSession();
  const [clients, actionable, user, firm] = await Promise.all([
    listClients(),
    listActionable(),
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.firm.findUnique({ where: { id: session.firmId } }),
  ]);

  const isReviewer = session.role === "REVIEWER";

  return (
    <main className="page">
      <header className="bar">
        <div>
          <h1>{firm?.name}</h1>
          <p className="muted">
            {user?.name} · <span className="badge">{session.role}</span>
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="link-button">
            Sign out
          </button>
        </form>
      </header>

      <h2>{isReviewer ? "Waiting for your review" : "Needs your upload"}</h2>
      {actionable.length === 0 ? (
        <p className="muted empty">
          {isReviewer
            ? "Nothing to review right now."
            : "Everything you were asked for has been uploaded."}
        </p>
      ) : (
        <ul className="list">
          {actionable.map((doc) => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`} className="row-button">
                <span>
                  {doc.name}
                  <span className="muted sub">{doc.client.name}</span>
                </span>
                <span className={`badge status-${doc.status}`}>
                  {STATUS_LABEL[doc.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2>All clients</h2>
      <ul className="list">
        {clients.map((client) => (
          <li key={client.id}>
            <Link href={`/clients/${client.id}`} className="row-button">
              {client.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
