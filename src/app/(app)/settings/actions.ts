"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { checkPassword, hashPassword, MIN_PASSWORD_LENGTH, requireAdmin, requireUser } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

export type SettingsState = { error?: string; success?: string; at?: number } | undefined;

const ok = (success: string): SettingsState => ({ success, at: Date.now() });
const fail = (error: string): SettingsState => ({ error, at: Date.now() });
const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ---------- Your account ----------

export async function updateProfile(_s: SettingsState, fd: FormData): Promise<SettingsState> {
  const me = await requireUser();
  const name = field(fd, "name");
  const email = field(fd, "email").toLowerCase();
  if (!name) return fail("Enter your name.");
  if (name.length > 80) return fail("The name can be at most 80 characters.");
  if (!validEmail(email)) return fail("Enter a valid email.");
  if (email !== me.email && (await db.user.count({ where: { email } }))) return fail("Another account already uses this email.");

  await db.user.update({ where: { id: me.id }, data: { name, email } });
  revalidatePath("/", "layout");
  return ok("Saved.");
}

export async function changePassword(_s: SettingsState, fd: FormData): Promise<SettingsState> {
  const me = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await checkPassword(current, user.passwordHash))) return fail("Your current password is wrong.");
  if (next.length < MIN_PASSWORD_LENGTH) return fail(`The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (next !== confirm) return fail("The new passwords don't match.");
  if (next === current) return fail("The new password is the same as the current one.");

  // New password + new session number: every other device is logged out.
  const updated = await db.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } },
  });
  await createSession({ userId: updated.id, role: updated.role, v: updated.sessionVersion });
  return ok("Password changed. Other devices were logged out.");
}

export async function setTheme(theme: Theme): Promise<void> {
  if (!isTheme(theme)) return;
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function logoutEverywhere(): Promise<void> {
  const me = await requireUser();
  await db.user.update({ where: { id: me.id }, data: { sessionVersion: { increment: 1 } } });
  await deleteSession();
  redirect("/login?reason=everywhere");
}

export async function deleteOwnAccount(_s: SettingsState, fd: FormData): Promise<SettingsState> {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await checkPassword(String(fd.get("password") ?? ""), user.passwordHash))) return fail("The password is wrong.");

  const [others, otherAdmins] = await Promise.all([
    db.user.count({ where: { id: { not: me.id } } }),
    db.user.count({ where: { id: { not: me.id }, role: "ADMIN" } }),
  ]);
  if (me.role === "ADMIN" && others > 0 && otherAdmins === 0) {
    return fail("You're the only admin. Make another account an admin first, or remove the other accounts.");
  }

  const wipeData = others === 0 && fd.get("wipe") === "1";
  await db.$transaction(async (tx) => {
    if (wipeData) {
      // Order matters only for readability; links are optional or cascade.
      await tx.timeLog.deleteMany();
      await tx.task.deleteMany();
      await tx.recurringTask.deleteMany();
      await tx.learningStep.deleteMany();
      await tx.learningPath.deleteMany();
      await tx.project.deleteMany();
    }
    await tx.user.delete({ where: { id: me.id } });
  });
  await deleteSession();
  redirect("/login?reason=deleted");
}

// ---------- Accounts (admins only) ----------

const ROLES: Role[] = ["ADMIN", "VIEWER"];

export async function createAccount(_s: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const name = field(fd, "name");
  const email = field(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const role = field(fd, "role") as Role;
  if (!name) return fail("Enter a name.");
  if (name.length > 80) return fail("The name can be at most 80 characters.");
  if (!validEmail(email)) return fail("Enter a valid email.");
  if (password.length < MIN_PASSWORD_LENGTH) return fail(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (!ROLES.includes(role)) return fail("Choose a role.");
  if (await db.user.count({ where: { email } })) return fail("An account with this email already exists.");

  await db.user.create({ data: { name, email, passwordHash: await hashPassword(password), role } });
  revalidatePath("/settings");
  return ok(`Account created for ${name}. They can log in with ${email}.`);
}

export async function setAccountRole(id: string, role: Role): Promise<string | undefined> {
  const me = await requireAdmin();
  if (!ROLES.includes(role)) return "Choose a role.";
  if (role === "VIEWER") {
    const otherAdmins = await db.user.count({ where: { id: { not: id }, role: "ADMIN" } });
    if (otherAdmins === 0) return "There must always be at least one admin.";
  }
  await db.user.updateMany({ where: { id }, data: { role } });
  revalidatePath("/", "layout");
  // Demoting yourself takes you out of admin-only pages straight away.
  if (id === me.id && role === "VIEWER") redirect("/settings");
}

export async function deleteAccount(id: string): Promise<string | undefined> {
  const me = await requireAdmin();
  if (id === me.id) return "Use “Delete my account” to remove your own account.";
  await db.user.deleteMany({ where: { id } });
  revalidatePath("/settings");
}

// ---------- Day planner ----------

const PLANNER_METHODS = ["Egyptian", "MuslimWorldLeague", "UmmAlQura", "Karachi", "Dubai", "Kuwait", "Qatar", "Turkey", "Singapore", "NorthAmerica", "MoonsightingCommittee", "Tehran"];

function minutesFrom(fd: FormData, name: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(fd.get(name) ?? "").trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export async function savePlannerSettings(_s: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const dayStart = minutesFrom(fd, "dayStart");
  const dayEnd = minutesFrom(fd, "dayEnd");
  const lunchStart = minutesFrom(fd, "lunchStart");
  const num = (name: string) => Number(fd.get(name));
  const maxBlock = num("maxBlock"), breakMinutes = num("breakMinutes"), lunchMinutes = num("lunchMinutes"), prayerMinutes = num("prayerMinutes");
  const latitude = num("latitude"), longitude = num("longitude");
  const timeZone = field(fd, "timeZone");
  const method = field(fd, "method");
  const asrMethod = field(fd, "asrMethod") === "Hanafi" ? "Hanafi" : "Standard";
  const locationName = field(fd, "locationName").slice(0, 80) || "My location";

  if (dayStart === null || dayEnd === null) return fail("Enter the start and end of your working day.");
  if (dayEnd - dayStart < 60) return fail("The working day must be at least an hour long.");
  if (![30, 45, 60, 75, 90, 120].includes(maxBlock)) return fail("Choose a focus block length.");
  if (![5, 10, 15, 20, 30].includes(breakMinutes)) return fail("Choose a break length.");
  if (![0, 15, 30, 45, 60].includes(lunchMinutes)) return fail("Choose a lunch length.");
  if (lunchMinutes > 0 && lunchStart === null) return fail("Enter a lunch time.");
  if (![5, 10, 15, 20, 30].includes(prayerMinutes)) return fail("Choose how long to keep free for each prayer.");
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return fail("Enter a valid latitude (−90 to 90) and longitude (−180 to 180).");
  }
  if (!PLANNER_METHODS.includes(method)) return fail("Choose a calculation method.");
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone });
  } catch {
    return fail("Choose a valid time zone.");
  }

  const data = {
    dayStart, dayEnd, maxBlock, breakMinutes, lunchStart: lunchStart ?? 780, lunchMinutes,
    prayersEnabled: fd.get("prayersEnabled") === "on", locationName, latitude, longitude, timeZone, method, asrMethod, prayerMinutes,
  };
  await db.plannerSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  revalidatePath("/", "layout");
  return ok("Saved. New plans use these settings.");
}
