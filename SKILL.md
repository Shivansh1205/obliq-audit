# Code Constraints

Binding on every phase of [PLAN.md](PLAN.md). The failure mode this exists to prevent: solving the stated problem, then padding it with handling for cases nobody asked about. That padding reads as noise to a reviewer grading Code Quality, and it costs hours the build does not have.

## The rule

**Write what a described feature needs. Nothing beyond it.**

Before any block of code, one question: *which line of the brief does this serve?* No answer → delete it.

## Specifics

**No speculative abstraction.** No interface with one implementation. No config object with one caller. No `utils/` file for a function used once — inline it. Generalise on the second real use, never the first imagined one.

**No unused surface.** No parameter nobody passes, no exported helper nobody imports, no status in the enum the workflow never reaches.

**No defensive branches for impossible states.** If the schema makes a document always have a client, don't branch on a missing one. Let it throw — a stack trace beats a silently swallowed bug. Validate exactly at the two real trust boundaries: the session cookie, and user input arriving at the server.

**No try/catch that only rethrows or logs.** Either handle it meaningfully or let it propagate.

**Comments explain why, never what.** `// firmId from session, never params — prevents cross-firm reads` earns its line. `// get the client` does not.

**Errors are one line.** `notFound()` or a 403. No error-code taxonomy, no custom error classes for a prototype.

**One way to do a thing.** One session getter. One audit writer. One status-transition path. If there are two, delete one before moving on.

## Where this does *not* apply

Thinning is for incidental code. It is never an excuse to skip:

- the `firmId` scope on a query
- an audit event on a state change
- server-side role and input validation

Those are the 45 marks. They are the feature.

## Pre-commit checklist

1. Any function with no caller? Delete.
2. Any parameter never passed a non-default? Delete.
3. Any branch unreachable given the schema? Delete.
4. Any comment restating the code? Delete.
5. Any abstraction with exactly one use? Inline.
6. Any state change without an audit event? **Fix — that is a real bug.**
7. Any query touching firm data without `firmId` from the session? **Fix — that is the security hole.**

Items 1–5 remove code. Items 6–7 are the only two that add it.
