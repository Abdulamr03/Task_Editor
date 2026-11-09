"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import type { FormState } from "@/components/auth-form";

// Used when the email doesn't exist, so a wrong email takes as long as a
// wrong password and doesn't reveal which accounts exist.
const DUMMY_HASH = "$2b$12$2cy3zY0gZwSc6RRpRqJwYOCZM3T19EyAWVz5KBTg1q/Cs8kI0BZr6";

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const fail = (error: string): FormState => ({ error, values: { email } });

  if (!email || !password) return fail("Enter your email and password.");

  const user = await db.user.findUnique({ where: { email } });
  const ok = await checkPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return fail("Wrong email or password.");

  await createSession({ userId: user.id, role: user.role });
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
