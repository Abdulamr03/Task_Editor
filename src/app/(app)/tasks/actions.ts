"use server";

import { revalidatePath } from "next/cache";
import type { TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { isPriority, isRule, isTaskStatus } from "@/lib/tasks";

export type TaskFormState = { error?: string; values?: Record<string, string>; savedAt?: number } | undefined;

// Task pages and every page that shows task progress.
function refresh() {
  revalidatePath("/tasks", "layout");
  revalidatePath("/projects", "layout");
  revalidatePath("/learning", "layout");
}

const FIELDS = ["title", "notes", "date", "priority", "estimate", "link", "rule"] as const;

// Reads the shared task fields. `needDate` for tasks, `needRule` for recurring tasks.
async function readForm(formData: FormData, { needDate = false, needRule = false } = {}) {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const fail = (error: string) => ({ ok: false as const, state: { error, values } });

  if (!values.title) return fail("Enter what needs doing.");
  if (values.title.length > 200) return fail("The title can be at most 200 characters.");
  if (!isPriority(values.priority)) return fail("Choose a priority.");

  let estimateMinutes: number | null = null;
  if (values.estimate) {
    estimateMinutes = Number(values.estimate);
    if (!Number.isInteger(estimateMinutes) || estimateMinutes < 1 || estimateMinutes > 24 * 60) {
      return fail("The estimate must be a whole number of minutes, from 1 to 1440.");
    }
  }

  // "project:<id>" or "path:<id>"; check it still exists.
  let projectId: string | null = null;
  let learningPathId: string | null = null;
  if (values.link) {
    const [kind, id] = values.link.split(":");
    const exists =
      kind === "project"
        ? await db.project.count({ where: { id } })
        : kind === "path"
          ? await db.learningPath.count({ where: { id } })
          : 0;
    if (!exists) return fail("The linked project or learning path no longer exists.");
    if (kind === "project") projectId = id;
    else learningPathId = id;
  }

  let date: Date | null = null;
  if (needDate) {
    const parsed = parseDateInput(values.date);
    if (!parsed || parsed === "invalid") return fail("Choose a valid date.");
    date = parsed;
  }

  if (needRule && !isRule(values.rule)) return fail("Choose how often it repeats.");

  return {
    ok: true as const,
    values,
    data: { title: values.title, notes: values.notes || null, priority: values.priority, estimateMinutes, projectId, learningPathId },
    date,
  };
}

// ---------- Tasks ----------

export async function createTask(_state: TaskFormState, formData: FormData): Promise<TaskFormState> {
  await requireAdmin();
  const result = await readForm(formData, { needDate: true });
  if (!result.ok) return result.state;
  await db.task.create({ data: { ...result.data, date: result.date! } });
  refresh();
  return { savedAt: Date.now() };
}

export async function updateTask(id: string, _state: TaskFormState, formData: FormData): Promise<TaskFormState> {
  await requireAdmin();
  const result = await readForm(formData, { needDate: true });
  if (!result.ok) return result.state;
  const updated = await db.task.updateMany({ where: { id }, data: { ...result.data, date: result.date! } });
  if (updated.count === 0) return { error: "This task no longer exists." };
  refresh();
  return { savedAt: Date.now() };
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  await requireAdmin();
  if (!isTaskStatus(status)) return;
  await db.task.updateMany({
    where: { id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  refresh();
}

export async function moveTask(id: string, dateText: string): Promise<void> {
  await requireAdmin();
  const date = parseDateInput(dateText);
  if (!date || date === "invalid") return;
  // A recurring task already on that day would clash; the move is skipped then.
  await db.task.updateMany({ where: { id }, data: { date } }).catch(() => undefined);
  refresh();
}

export async function deleteTask(id: string): Promise<void> {
  await requireAdmin();
  await db.task.deleteMany({ where: { id } });
  refresh();
}

// Moves every unfinished task from earlier days to today.
// Missed recurring tasks are skipped: today already has its own copy.
export async function carryOverAll(): Promise<void> {
  await requireAdmin();
  await db.task.updateMany({
    where: { date: { lt: today() }, status: { not: "DONE" }, recurringTaskId: null },
    data: { date: today() },
  });
  refresh();
}

// ---------- Recurring tasks ----------

export async function createRecurring(_state: TaskFormState, formData: FormData): Promise<TaskFormState> {
  await requireAdmin();
  const result = await readForm(formData, { needRule: true });
  if (!result.ok) return result.state;
  await db.recurringTask.create({ data: { ...result.data, rule: result.values.rule as "DAILY" | "WEEKDAYS" } });
  refresh();
  return { savedAt: Date.now() };
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  await db.recurringTask.updateMany({ where: { id }, data: { active } });
  refresh();
}

// Deleting a recurring task keeps the tasks it already added.
export async function deleteRecurring(id: string): Promise<void> {
  await requireAdmin();
  await db.recurringTask.deleteMany({ where: { id } });
  refresh();
}
