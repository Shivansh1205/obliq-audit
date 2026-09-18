import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "session";
const SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure-secret";

export type Session = { userId: string; firmId: string; role: "STAFF" | "REVIEWER" };

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
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

  return JSON.parse(Buffer.from(payload, "base64url").toString());
}

export const COOKIE_NAME = COOKIE;

export async function readSession(): Promise<Session | null> {
  const cookie = (await cookies()).get(COOKIE)?.value;
  return cookie ? verify(cookie) : null;
}
