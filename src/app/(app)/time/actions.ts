"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { parseDuration } from "@/lib/duration";

export type TimeFormState = { error?: string; values?: Record<string, string>; savedAt?: number } | undefined;

function refresh() {
  revalidatePath("/", "layout");
}

const FIELDS = ["date", "duration", "link", "note"] as const;

async function readForm(formData: FormData) {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const fail = (error: string) => ({ ok: false as const, state: { error, values } });

  const date = parseDateInput(values.date);
  if (!date || date === "invalid") return fail("Choose a valid date.");

  const minutes = parseDuration(values.duration);
  if (minutes === null) return fail('Enter the time spent, like "45", "1h 30m" or "1:30" (up to 24 hours).');

  let projectId: string | null = null;
  let learningPathId: string | null = null;
  if (values.link) {
    const [kind, id] = values.link.split(":");
    const exists =
      kind === "project" ? await db.project.count({ where: { id } }) : kind === "path" ? await db.learningPath.count({ where: { id } }) : 0;
    if (!exists) return fail("The linked project or learning path no longer exists.");
    if (kind === "project") projectId = id;
    else learningPathId = id;
  }
  if (values.note.length > 500) return fail("The note can be at most 500 characters.");

  return { ok: true as const, data: { date, minutes, note: values.note || null, projectId, learningPathId } };
}

export async function createTimeLog(_state: TimeFormState, formData: FormData): Promise<TimeFormState> {
  await requireAdmin();
  const result = await readForm(formData);
  if (!result.ok) return result.state;
  await db.timeLog.create({ data: result.data });
  refresh();
  return { savedAt: Date.now() };
}

export async function updateTimeLog(id: string, _state: TimeFormState, formData: FormData): Promise<TimeFormState> {
  await requireAdmin();
  const result = await readForm(formData);
  if (!result.ok) return result.state;
  const updated = await db.timeLog.updateMany({ where: { id }, data: result.data });
  if (updated.count === 0) return { error: "This entry no longer exists." };
  refresh();
  return { savedAt: Date.now() };
}

export async function deleteTimeLog(id: string): Promise<void> {
  await requireAdmin();
  await db.timeLog.deleteMany({ where: { id } });
  refresh();
}
