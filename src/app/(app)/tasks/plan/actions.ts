"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { dayFrame } from "@/lib/planner/day";
import { getPlannerSettings } from "@/lib/planner/settings";
import { pack, type Block, type PlanItem } from "@/lib/planner/pack";

function refresh() {
  revalidatePath("/", "layout");
}

// Removes a day's plan: its schedule, the unfinished tasks it created, and planned times.
async function clearDay(tx: Prisma.TransactionClient, day: Date) {
  await tx.task.deleteMany({ where: { date: day, fromPlan: true, status: { not: "DONE" } } });
  await tx.task.updateMany({ where: { date: day, status: { not: "DONE" } }, data: { plannedStart: null } });
  await tx.dayPlan.deleteMany({ where: { date: day } });
}

// Saves the reviewed plan: places it on the clock again (same rules as the
// preview), creates tasks for project and study blocks, and gives every planned
// task its start time.
export async function savePlan(input: {
  date: string;
  summary: string;
  items: PlanItem[];
  // Start of the planned time (the preview's), e.g. "now" on today.
  startAt?: number;
}): Promise<{ error: string } | { ok: true; unplaced: number }> {
  await requireAdmin();
  const day = parseDateInput(input.date);
  if (!day || day === "invalid" || day < today()) return { error: "Choose today or a later day." };

  // Check every item against the database.
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, 40);
  const [tasks, projects, paths] = await Promise.all([
    db.task.findMany({ where: { id: { in: items.map((i) => i.taskId).filter((x): x is string => Boolean(x)) }, status: { not: "DONE" } } }),
    db.project.findMany({ where: { id: { in: items.map((i) => i.projectId).filter((x): x is string => Boolean(x)) } }, select: { id: true } }),
    db.learningPath.findMany({ where: { id: { in: items.map((i) => i.learningPathId).filter((x): x is string => Boolean(x)) } }, select: { id: true } }),
  ]);
  // Tasks an earlier plan made for this day are removed when saving, so they can't be reused.
  const taskById = new Map(tasks.filter((t) => !(t.fromPlan && t.date.getTime() === day.getTime())).map((t) => [t.id, t]));
  const projectIds = new Set(projects.map((p) => p.id));
  const pathIds = new Set(paths.map((p) => p.id));
  const clean: PlanItem[] = items.flatMap((i, n): PlanItem[] => {
    const minutes = Math.min(Math.max(Math.round(Number(i.minutes) / 5) * 5 || 0, 10), 300);
    const difficulty: PlanItem["difficulty"] = i.difficulty === "EASY" || i.difficulty === "HARD" ? i.difficulty : "MEDIUM";
    const title = String(i.title ?? "").trim().slice(0, 200);
    const base = { key: `i${n}`, minutes, difficulty, reason: String(i.reason ?? "").slice(0, 200), color: typeof i.color === "string" ? i.color : null };
    if (i.kind === "task" && i.taskId && taskById.has(i.taskId)) {
      return [{ ...base, kind: "task", title: taskById.get(i.taskId)!.title, taskId: i.taskId, projectId: null, learningPathId: null }];
    }
    if (i.kind === "project" && i.projectId && projectIds.has(i.projectId) && title) {
      return [{ ...base, kind: "project", title, taskId: null, projectId: i.projectId, learningPathId: null }];
    }
    if (i.kind === "study" && i.learningPathId && pathIds.has(i.learningPathId) && title) {
      return [{ ...base, kind: "study", title, taskId: null, projectId: null, learningPathId: i.learningPathId }];
    }
    return [];
  });
  if (clean.length === 0) return { error: "The plan is empty." };

  // Only today can start later than the working day (from "now").
  const settings = await getPlannerSettings();
  const isToday = day.getTime() === today().getTime();
  const startAt = isToday && Number.isInteger(input.startAt) ? (input.startAt as number) : null;
  const frame = await dayFrame(day, startAt);
  const { blocks, unplaced } = pack(clean, frame.fixed, frame.shape);

  // Re-planning later in the day keeps what's already behind you: finished
  // blocks, breaks and prayers before the new start.
  let past: Block[] = [];
  if (frame.shape.dayStart > settings.dayStart) {
    const previous = await db.dayPlan.findUnique({ where: { date: day } });
    const oldBlocks = (previous?.blocks ?? []) as unknown as Block[];
    const doneIds = new Set(
      (await db.task.findMany({ where: { id: { in: oldBlocks.map((b) => b.taskId).filter((x): x is string => Boolean(x)) }, status: "DONE" }, select: { id: true } })).map((t) => t.id),
    );
    past = oldBlocks.filter((b) => b.end <= frame.shape.dayStart && (b.kind !== "work" || (b.taskId != null && doneIds.has(b.taskId))));
  }

  await db.$transaction(async (tx) => {
    await clearDay(tx, day);
    const taskFor = new Map<string, string>();
    for (const item of clean) {
      const own = blocks.filter((b) => b.kind === "work" && b.itemKey === item.key);
      if (own.length === 0) continue;
      const start = own[0].start;
      const placedMinutes = own.reduce((s, b) => s + (b.end - b.start), 0);
      if (item.taskId) {
        const t = taskById.get(item.taskId)!;
        // Moves an overdue task to this day and gives it its start time.
        await tx.task.update({
          where: { id: t.id },
          data: { date: day, plannedStart: start, estimateMinutes: t.estimateMinutes ?? placedMinutes, difficulty: t.difficulty ?? item.difficulty },
        });
        taskFor.set(item.key, t.id);
      } else {
        const created = await tx.task.create({
          data: {
            title: item.title,
            notes: item.reason || null,
            date: day,
            estimateMinutes: placedMinutes,
            difficulty: item.difficulty,
            plannedStart: start,
            fromPlan: true,
            projectId: item.projectId,
            learningPathId: item.learningPathId,
          },
        });
        taskFor.set(item.key, created.id);
      }
    }
    const saved: Block[] = [
      ...past,
      ...blocks.map((b) => (b.kind === "work" && b.itemKey ? { ...b, taskId: taskFor.get(b.itemKey) ?? null } : b)),
    ].sort((a, b) => a.start - b.start);
    await tx.dayPlan.create({
      data: { date: day, blocks: saved as unknown as Prisma.InputJsonValue, summary: String(input.summary ?? "").slice(0, 500) || null },
    });
  });
  refresh();
  return { ok: true, unplaced: unplaced.length };
}

export async function clearPlan(date: string): Promise<void> {
  await requireAdmin();
  const day = parseDateInput(date);
  if (!day || day === "invalid") return;
  await db.$transaction((tx) => clearDay(tx, day));
  refresh();
}
