# Mini Audit Document Review System

A prototype for OBLIQ-in's audit workflow evaluation. Documents move through review and correction, and every meaningful action is traceable.

```
Client → Documents → Review → Approve / Request Correction → Audit History
```

> **Status: in progress.** The data layer, tenant isolation, and audit schema are complete and verifiable (see [Verifying tenant isolation](#verifying-tenant-isolation)). The UI is not built yet, so `npm run dev` currently serves the starter page. Build order and rationale are in [PLAN.md](PLAN.md).

## Setup

Requires Node 20.9+ (developed on Node 24).

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

`npm install` generates the Prisma client via a `postinstall` hook — the generated client is gitignored, so this step is required, not optional.

### Environment

`.env` is gitignored. Create one with:

```
DATABASE_URL="file:./dev.db"
```

`SESSION_SECRET` is optional and falls back to a hardcoded dev value. See [Known limitations](#known-limitations).

### Seeded data

| Firm | Staff | Reviewer | Clients |
|---|---|---|---|
| ABC & Co. | Rohit | Aman | ABC Traders Pvt. Ltd., Sunrise Foods |
| XYZ & Co. | Priya | Karan | Meridian Textiles |

Each client gets the five required documents (Bank Statement, Sales Register, Purchase Register, GST Return, Expense Summary) at status `PENDING`.

## Architecture

```
Browser
   ↓
Next.js App Router  ── Server Components + Server Actions
   ↓
lib/dal.ts          ── tenant boundary: every query scoped by session.firmId
   ↓
Prisma 7 + SQLite
   ↓
AuditEvent          ── append-only
```

One Next.js app rather than a separate SPA and API: no CORS, no second process, and one `npm install` for a reviewer. SQLite because `dev.db` is a file — nothing to provision.

### Data model

| Model | Purpose |
|---|---|
| `Firm` | Tenant root |
| `User` | Belongs to a firm; `STAFF` or `REVIEWER` |
| `Client` | Belongs to a firm |
| `Document` | Belongs to a client; carries status, uploader, review comment |
| `AuditEvent` | Append-only record of who did what, when, to which document |

Status flow: `PENDING → UPLOADED → UNDER_REVIEW → APPROVED`, with `CORRECTION_REQUIRED` looping back to `UPLOADED`.

`firmId` sits on every firm-scoped table rather than being reached through a join, so any query can be constrained directly.

## How Firm A stays isolated from Firm B

**The boundary is the query, not the route.**

Every read goes through [`lib/dal.ts`](lib/dal.ts), where `firmId` is taken from the signed session cookie and never from a caller:

```ts
export async function getClient(clientId: string) {
  const { firmId } = await requireSession();
  return prisma.client.findFirst({
    where: { id: clientId, firmId },   // firmId is not a parameter
  });
}
```

A user from Firm B who passes a Firm A client id is not *denied* — the row does not match, and they get `null` → 404. The distinction matters: there is no permission check to forget on a new route, because a caller has no way to widen the scope. Adding a route cannot accidentally expose another firm's data unless it bypasses the DAL entirely.

This reflects two things the brief asks about:

- **Authentication ≠ authorization.** The session says *who you are and which firm you belong to*. Authorization is enforced separately, at the point of data access, on every single query.
- **Hiding a button ≠ security.** Reviewer-only actions will be enforced server-side by role. The UI hiding a control is cosmetic; the server rejecting the action is the control.

Session cookies are HMAC-signed, so a client cannot edit `firmId` in the payload without invalidating the signature.

### Verifying tenant isolation

```bash
npm run check:isolation
```

Four assertions against seeded data — three of them negative:

```
PASS  ABC reads its own client
PASS  XYZ cannot read ABC's client by id
PASS  XYZ cannot read ABC's document by id
PASS  XYZ's client list excludes ABC's clients
```

Exits non-zero on failure. The check was validated by deliberately removing a `firmId` scope and confirming it flips to `FAIL` — a check that cannot fail proves nothing.

## Scope

**Built:** the workflow above, two firms, two roles, an append-only audit trail.

**Deliberately not built:** real file storage (an upload records a filename — storage is not what is being evaluated), password hashing, pagination, soft deletes, an admin panel, and everything in the brief's exclusion list (WhatsApp, GST filing, OCR, and so on).

Leaving these out is the point. A small working product beats a large unfinished one.

## Known limitations

- `SESSION_SECRET` falls back to a hardcoded dev value, so seeded sessions are forgeable in a deployment that does not set it. Acceptable for an evaluation prototype; a real deployment would fail closed on a missing secret.
- Login is a pick-from-list of seeded users. There are no passwords, by design — the brief excludes production authentication, and the marks are on authorization.
- SQLite is single-writer. Fine for a prototype, not for concurrent firms in production.

## Tech

Next.js 16.3 (App Router) · React 19.2 · TypeScript · Prisma 7.10 · SQLite

## AI Tools Used

```
AI Tools Used:
ChatGPT: No
Claude: Yes — Claude Code (Opus 5)
Gemini: No
Cursor: No
GitHub Copilot: No

How AI was used:
Claude Code was used throughout: planning the build order, writing the
schema and data-access layer, and writing this README. Specific examples:
it read the bundled Prisma 7 and Next.js 16 documentation to catch two
breaking changes that would otherwise have surfaced as runtime bugs (SQL
providers now require a driver adapter; the Prisma generator defaults to
ESM output, which silently leaves model accessors undefined in a CommonJS
project), and it caught a bug in the isolation check itself where a failed
assertion still exited zero.

All architectural decisions — the DAL chokepoint as the tenant boundary,
SQLite over Postgres, no real file storage — were reviewed and accepted
deliberately, and I can explain the reasoning behind each. The trade-offs
are documented in PLAN.md and in the sections above.
```

## What would you improve if you had one more week?

Placeholder — to be written once the workflow is complete.
