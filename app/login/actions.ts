"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { COOKIE_NAME, serialize } from "@/lib/session";

// No password: the brief excludes production authentication. The user id is
// looked up server-side, so the session is built from the database rather
// than from anything the client sent.
export async function login(formData: FormData) {
  const userId = String(formData.get("userId"));
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  (await cookies()).set(
    COOKIE_NAME,
    serialize({ userId: user.id, firmId: user.firmId, role: user.role }),
    { httpOnly: true, sameSite: "lax", path: "/" },
  );
  redirect("/clients");
}

export async function logout() {
  (await cookies()).delete(COOKIE_NAME);
  redirect("/login");
}
