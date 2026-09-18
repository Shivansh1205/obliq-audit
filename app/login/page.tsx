import { prisma } from "@/lib/db";
import { login } from "./actions";

// Not firm-scoped by design: this is the pick-a-user screen that exists
// because the prototype has no passwords. Every other read goes through
// lib/dal.ts and is scoped to the session's firm.
export default async function LoginPage() {
  const firms = await prisma.firm.findMany({
    include: { users: { orderBy: { role: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="page narrow">
      <h1>Audit Review</h1>
      <p className="muted">Sign in as a seeded user. Two firms, to show isolation.</p>

      {firms.map((firm) => (
        <section key={firm.id} className="card">
          <h2>{firm.name}</h2>
          <ul className="list">
            {firm.users.map((user) => (
              <li key={user.id}>
                <form action={login}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button type="submit" className="row-button">
                    <span>{user.name}</span>
                    <span className="badge">{user.role}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
