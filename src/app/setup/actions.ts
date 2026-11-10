"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { createSession } from "@/lib/session";
import type { FormState } from "@/components/auth-form";

// Creates the first admin account. Only works while there are no users,
// so nobody can use this page once the app is set up.
export async function createAdmin(_state: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fail = (error: string): FormState => ({ error, values: { name, email } });

  if (!name) return fail("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password !== confirm) return fail("Passwords don't match.");

  const passwordHash = await hashPassword(password);

  // Check and create in one transaction, so two people can't both
  // create an admin at the same moment.
  const user = await db.$transaction(async (tx) => {
    if ((await tx.user.count()) > 0) return null;
    return tx.user.create({ data: { name, email, passwordHash, role: "ADMIN" } });
  }, { isolationLevel: "Serializable" }).catch(() => null);

  if (!user) redirect("/login");

  await createSession({ userId: user.id, role: user.role, v: user.sessionVersion });
  redirect("/");
}
