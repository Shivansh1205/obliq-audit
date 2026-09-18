# Mini Audit Document Review System — Build Plan

OBLIQ-in FE Evaluation. Scope is one slice, not a platform:

```
Client → Documents → Review → Approve / Request Correction → Audit History
```

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | Next.js (App Router), one app | No CORS, no second process, no second package.json |
| DB | SQLite via Prisma | Zero install for the grader; `dev.db` is a file |
| Auth | Seeded users, pick-from-list → signed cookie | Brief says no production auth. Marks are on *authorization*, not login |
| Styling | Plain CSS modules or minimal Tailwind | UI is 5 marks. Do not spend more than that |

Run: `npm install && npx prisma migrate dev && npm run seed && npm run dev`

## Where the marks are

| Category | Marks | Phase |
|---|---|---|
| Working Core Workflow | 25 | 2–4 |
| Audit Trail / Traceability | 20 | 3 |
| Backend / Data Design | 15 | 1 |
| Security / Tenant Isolation | 15 | 1, 5 |
| Code Quality | 10 | all |
| UI / Usability | 5 | 4 |
| Architecture Explanation | 5 | 6 |
| Product Judgement | 5 | all (visible as what we *didn't* build) |

45 of 100 sit in the audit trail + tenant isolation. Those get built first and never get rushed.

---

## Phase 0 — Repo skeleton

`obliq/` is currently empty **inside the phoenix git repo**. First action is `git init` here so this never lands in a phoenix commit.

- `git init`, `.gitignore` (`node_modules`, `.env`, `*.db`, `.next`)
- `create-next-app`, add Prisma
- Verify blank page renders

**Done when:** `npm run dev` serves a page from a repo whose `git remote -v` is empty (not phoenix).

---

## Phase 1 — Data model + tenant isolation

The security story is decided here, not bolted on later. Every table that holds firm data carries `firmId`.

```
Firm    id, name
User    id, firmId, name, role(STAFF|REVIEWER)
Client  id, firmId, name
Document id, clientId, name, status, uploadedById, uploadedAt, reviewComment
AuditEvent id, firmId, actorId, documentId, action, reason, createdAt
```

Status: `PENDING → UPLOADED → UNDER_REVIEW → APPROVED`, with `CORRECTION_REQUIRED` looping back to `UPLOADED`.

**The isolation rule — one chokepoint, not scattered checks.** A single `getSession()` returns `{userId, firmId, role}` from the cookie, and every data access goes through helpers that take `firmId` from the *session*, never from the request:

```ts
// lib/data.ts — firmId always comes from session, never from params
export async function getClient(session, clientId) {
  return prisma.client.findFirst({ where: { id: clientId, firmId: session.firmId } });
}
```

A Firm B user hitting Firm A's client id gets `null` → 404. Not a hidden button — a query that cannot match.

**Done when:** seed script creates ABC & Co. + XYZ & Co. with staff and reviewer each, and a written note in the README explaining the chokepoint.

---

## Phase 2 — Auth + client/document listing

- Login page lists seeded users grouped by firm; selecting one sets a signed httpOnly cookie
- Client list (firm-scoped), client detail with its document list + statuses
- "Upload" = record a filename + uploader + timestamp. **No real file storage** — a filename string is enough to demo the workflow, and the brief does not ask for storage

**Done when:** logging in as Rohit (Firm A) and Priya (Firm B) shows disjoint client lists.

---

## Phase 3 — Audit trail (highest value per hour)

Built before the review UI so review actions have somewhere to write.

**One writer, called from inside the same transaction as the state change.** An event that can be forgotten is worse than no event:

```ts
// lib/audit.ts
export async function recordEvent(tx, session, { documentId, action, reason }) { ... }
```

Actions: `UPLOADED`, `REVIEW_STARTED`, `CORRECTION_REQUESTED`, `APPROVED`, `REUPLOADED`.

Immutability for a prototype = **append-only by construction**: no update or delete path exists anywhere in the codebase, and no UI reaches it. Say exactly that in the README rather than claiming more.

**Done when:** the timeline renders who / what / when / which document / reason, matching the brief's example.

---

## Phase 4 — Review screen (the main feature)

Reviewer opens a document and sees: name, client, uploaded by, upload date/time, current status, review comment.

- **Approve** → `APPROVED` + event
- **Request Correction** → comment is **required** (server-validated, not just the form) → `CORRECTION_REQUIRED` + event carrying the reason
- Staff re-uploads → back to `UPLOADED` + event

Reviewer-only actions are enforced **server-side by role**; hiding the button is cosmetic only.

**Done when:** the brief's full example sequence can be reproduced by clicking, end to end.

---

## Phase 5 — Prove the isolation

Not a test suite — a handful of assertions that demonstrate the claim, since "show how your backend prevents this" is worth 15 marks.

- Firm B user requesting a Firm A client id → 404
- Firm B user posting a review to a Firm A document → 404
- Staff attempting an approve → 403

A short script or a few tests, plus a screenshot in the README. Enough to prove it, no more.

---

## Phase 6 — README + submission

Required by the brief, easy marks, commonly dropped:

- Setup instructions + env details
- Screenshots
- Architecture diagram: `Frontend → Backend/API → Database → Audit Log`
- **How Firm A stays isolated from Firm B** (max 500 words)
- **AI disclosure block** — exact format the brief specifies
- **"What would you improve if you had one more week?"** (max 300 words) — name the single next most valuable improvement, not a feature list

Optional if time survives: 3–5 min unedited screen recording.

---

## Not building

WhatsApp, GST filing, tax calc, portal automation, OCR, AI agents, mobile, payments, analytics, production auth, cloud-scale anything. Also skipped deliberately: real file uploads, password hashing, pagination, soft deletes, an admin panel.

Leaving these out **is** the product-judgement mark. The README says so explicitly.

---

## Code constraints

Binding for every phase. See [SKILL.md](SKILL.md) for the full rule set and the pre-commit checklist.

The short version: build only what a described feature needs. No speculative abstraction, no options nobody passes, no defensive branches for states the model makes impossible. A small working product beats a large unfinished one — that is the brief's sentence, and it is also the grading rubric.
