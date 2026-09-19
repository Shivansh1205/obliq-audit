import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "session";

// Fail closed in production: a missing secret there would silently fall back
// to a value that is public in this repo, making every session forgeable.
function secret() {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    // Deliberately fatal: signing with the fallback below would make every
    // session forgeable, and the value is public in this repo. The message
    // is what surfaces in the deployment log.
    throw new Error(
      "SESSION_SECRET is not set. Add it to the deployment environment and redeploy — " +
        "sessions cannot be signed safely without it.",
    );
  }
  return "dev-only-insecure-secret";
}

export type Session = { userId: string; firmId: string; role: "STAFF" | "REVIEWER" };

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

// Signed, not encrypted: the payload is readable, but a client cannot forge a
// different firmId without the secret.
export function serialize(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verify(cookie: string): Session | null {
  const [payload, mac] = cookie.split(".");
  if (!payload || !mac) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  // A valid signature still does not guarantee a well-formed payload: an old
  // cookie from a changed schema would parse but leave firmId undefined, which
  // would then reach a query as `where: { firmId: undefined }`.
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
  const valid =
    typeof parsed?.userId === "string" &&
    typeof parsed?.firmId === "string" &&
    (parsed?.role === "STAFF" || parsed?.role === "REVIEWER");
  return valid ? parsed : null;
}

export const COOKIE_NAME = COOKIE;

export async function readSession(): Promise<Session | null> {
  const cookie = (await cookies()).get(COOKIE)?.value;
  return cookie ? verify(cookie) : null;
}
