import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";

export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hasAnyUser(): Promise<boolean> {
  return (await db.user.count()) > 0;
}

// The logged-in user, or null. Also null when the account was deleted, or its
// password changed / "log out everywhere" was used after this cookie was made.
export async function currentUser() {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== session.v) return null;
  return user;
}

// Returns the logged-in user, or sends the visitor to the login page.
// /logout clears an outdated cookie first (otherwise the middleware, which
// can't see the database, would keep sending them back here).
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/logout?reason=expired");
  return user;
}

// Same as requireUser, but only admins may continue.
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
