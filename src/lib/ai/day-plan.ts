import { db } from "@/lib/db";
import { today } from "@/lib/dates";
import type { Difficulty, PlanItem } from "@/lib/planner/pack";
import { AiError, askForJson } from "./client";

// "Plan my day": Claude picks what to work on and for how long, in the order
// to do it. The app then places it on the clock (src/lib/planner/pack.ts).

const DAY_MS = 86_400_000;
const days = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY_MS);

// Everything Claude may choose from, with ids to point at.
export async function gatherCandidates(day: Date) {
  const [tasks, projects, paths] = await Promise.all([
    db.task.findMany({
      where: {
        status: { not: "DONE" },
        // Tasks an earlier plan made for this day are replaced, so they aren't offered again.
        NOT: { fromPlan: true, date: day },
        OR: [
          { date: day },
          // Overdue (missed recurring copies stay on their own day).
          { date: { lt: day }, recurringTaskId: null },
        ],
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      take: 80,
      include: { project: { select: { id: true, name: true } }, learningPath: { select: { id: true, title: true } } },
    }),
    db.project.findMany({
      where: { status: "ACTIVE" },
      take: 30,
      include: { tasks: { select: { status: true, estimateMinutes: true } } },
    }),
    db.learningPath.findMany({
      where: { status: "ACTIVE" },
      take: 15,
      include: {
        steps: {
          orderBy: [{ milestone: { order: "asc" } }, { order: "asc" }],
          select: { id: true, title: true, done: true, estimateMinutes: true, difficulty: true, milestone: { select: { title: true } } },
        },
      },
    }),
  ]);

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      estimateMinutes: t.estimateMinutes,
      difficulty: t.difficulty,
      daysOverdue: Math.max(0, days(day, t.date)),
      project: t.project?.name ?? null,
      learningPath: t.learningPath?.title ?? null,
      notes: t.notes?.slice(0, 200) ?? null,
    })),
    projects: projects.map((p) => {
      const open = p.tasks.filter((t) => t.status !== "DONE");
      return {
        id: p.id,
        name: p.name,
        description: p.description?.slice(0, 200) ?? null,
        daysUntilDue: p.dueDate ? days(p.dueDate, day) : null,
        tasksDone: p.tasks.length - open.length,
        tasksOpen: open.length,
        openEstimateMinutes: open.reduce((s, t) => s + (t.estimateMinutes ?? 0), 0),
      };
    }),
    learningPaths: paths.map((l) => ({
      id: l.id,
      title: l.title,
      stepsDone: l.steps.filter((s) => s.done).length,
      stepsTotal: l.steps.length,
      nextLevels: l.steps
        .filter((s) => !s.done)
        .slice(0, 3)
        .map((s) => ({ title: s.title, milestone: s.milestone?.title ?? null, estimateMinutes: s.estimateMinutes, difficulty: s.difficulty })),
    })),
  };
}

export type Candidates = Awaited<ReturnType<typeof gatherCandidates>>;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "items"],
  properties: {
    summary: { type: "string", description: "One or two friendly sentences: the focus of the day and why." },
    items: {
      type: "array",
      description: "Work for the day, in the order to do it.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "taskId", "projectId", "learningPathId", "title", "minutes", "difficulty", "reason"],
        properties: {
          kind: { type: "string", enum: ["task", "project", "study"] },
          taskId: { anyOf: [{ type: "string" }, { type: "null" }], description: "For kind task: the task's id." },
          projectId: { anyOf: [{ type: "string" }, { type: "null" }], description: "For kind project: the project's id." },
          learningPathId: { anyOf: [{ type: "string" }, { type: "null" }], description: "For kind study: the learning path's id." },
          title: { type: "string", description: "What to do in this block, short and concrete." },
          minutes: { type: "integer", description: "Total minutes for this item today." },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
          reason: { type: "string", description: "Why it's in the plan, a few words (e.g. 'due in 3 days')." },
        },
      },
    },
  },
} as const;

const SYSTEM = `You plan a person's working day in a personal task tracker. You decide WHAT to work on, for HOW LONG, and in WHAT ORDER. The app places your items on the clock itself (around prayers, lunch and breaks, and it splits long items into sessions), so don't give times and don't add breaks.

Choose from:
- tasks (kind "task", use its taskId): overdue tasks and tasks planned for this day,
- projects (kind "project", use its projectId): for focused work on a project with an upcoming deadline or open work even when no single task covers it; give a concrete title like "Thesis: draft chapter 2 methods",
- learning paths (kind "study", use its learningPathId): to study the path's next levels; name the level(s) in the title.

How to plan:
- Fill about the available work minutes, not more. Use realistic times: the task or level estimate when there is one, otherwise judge from the title and difficulty.
- Most urgent first in importance: overdue and high-priority tasks, projects whose deadline is near compared to their open work.
- Keep learning moving most days (often 60–120 minutes in total) unless deadlines are pressing or the note says otherwise.
- Order: put HARD, deep-focus work early in the day (the morning is best for focus), MEDIUM work around midday, and EASY work and small admin tasks later; group small tasks together.
- Don't switch topics too often: prefer fewer, longer items (30–120 minutes each) over many tiny ones, except for small tasks.
- Set difficulty for each item: use the given one when present, otherwise estimate it.
- Use only ids from the lists. Never invent ids. Leave out things that don't fit today.
- Follow the person's note if they give one.
Write in English unless the titles are in another language.`;

export async function planDay(options: {
  day: Date;
  candidates: Candidates;
  capacityMinutes: number;
  dayStart: string;
  dayEnd: string;
  fixedSummary: string;
  note: string;
}): Promise<{ summary: string; items: PlanItem[] }> {
  const { candidates } = options;
  const dayName = options.day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const isToday = options.day.getTime() === today().getTime();

  const raw = await askForJson({
    system: SYSTEM,
    schema: SCHEMA,
    maxTokens: 16000,
    what: "planning your day",
    content: [
      {
        type: "text",
        text:
          `Day to plan: ${dayName}${isToday ? " (today)" : ""}. Working hours ${options.dayStart}–${options.dayEnd}.\n` +
          `Fixed blocks the app keeps free: ${options.fixedSummary || "none"}.\n` +
          `Available work time after fixed blocks and breaks: about ${options.capacityMinutes} minutes.\n\n` +
          `Tasks (JSON):\n${JSON.stringify(candidates.tasks)}\n\n` +
          `Active projects (JSON):\n${JSON.stringify(candidates.projects)}\n\n` +
          `Active learning paths and their next levels (JSON):\n${JSON.stringify(candidates.learningPaths)}\n\n` +
          (options.note ? `My note for today: ${options.note}\n\n` : "") +
          "Plan the day.",
      },
    ],
  });
  return cleanItems(raw, candidates);
}

// Keeps only items that point at real tasks / projects / paths; fixes minutes and titles.
export function cleanItems(raw: unknown, c: Candidates): { summary: string; items: PlanItem[] } {
  const r = (raw ?? {}) as { summary?: unknown; items?: unknown };
  const tasks = new Map(c.tasks.map((t) => [t.id, t]));
  const projects = new Map(c.projects.map((p) => [p.id, p]));
  const paths = new Map(c.learningPaths.map((l) => [l.id, l]));
  const seenTasks = new Set<string>();
  const items: PlanItem[] = [];

  for (const [i, it] of (Array.isArray(r.items) ? r.items : []).slice(0, 40).entries()) {
    const x = (it ?? {}) as Record<string, unknown>;
    const title = typeof x.title === "string" ? x.title.trim().replace(/\s+/g, " ").slice(0, 200) : "";
    let minutes = typeof x.minutes === "number" ? Math.round(x.minutes / 5) * 5 : 0;
    minutes = Math.min(Math.max(minutes, 10), 300);
    const difficulty: Difficulty = x.difficulty === "EASY" || x.difficulty === "HARD" ? x.difficulty : "MEDIUM";
    const reason = typeof x.reason === "string" ? x.reason.trim().slice(0, 200) : "";
    const base = { key: `i${i}`, minutes, difficulty, reason, taskId: null, projectId: null, learningPathId: null, color: null };

    if (x.kind === "task" && typeof x.taskId === "string" && tasks.has(x.taskId)) {
      if (seenTasks.has(x.taskId)) continue;
      seenTasks.add(x.taskId);
      items.push({ ...base, kind: "task", taskId: x.taskId, title: tasks.get(x.taskId)!.title });
    } else if (x.kind === "project" && typeof x.projectId === "string" && projects.has(x.projectId)) {
      items.push({ ...base, kind: "project", projectId: x.projectId, title: title || `Work on ${projects.get(x.projectId)!.name}` });
    } else if (x.kind === "study" && typeof x.learningPathId === "string" && paths.has(x.learningPathId)) {
      items.push({ ...base, kind: "study", learningPathId: x.learningPathId, title: title || `Study: ${paths.get(x.learningPathId)!.title}` });
    }
  }
  const summary = typeof r.summary === "string" ? r.summary.trim().slice(0, 500) : "";
  if (items.length === 0) throw new AiError("Claude didn't find anything to plan. Add some tasks, projects or learning paths first.");
  return { summary, items };
}
