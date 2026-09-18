import Link from "next/link";
import { listClients, requireSession } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { logout } from "../login/actions";

export default async function ClientsPage() {
  const session = await requireSession();
  const [clients, user, firm] = await Promise.all([
    listClients(),
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.firm.findUnique({ where: { id: session.firmId } }),
  ]);

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

      <h2>Clients</h2>
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
