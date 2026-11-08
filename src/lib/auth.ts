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

// Returns the logged-in user, or sends the visitor to the login page.
// Also checks the user still exists, so a deleted account loses access at once.
export async function requireUser() {
  const session = await readSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) redirect("/login");

  return user;
}

// Same as requireUser, but only admins may continue.
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
