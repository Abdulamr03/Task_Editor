import type { ProjectStatus, Priority, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { addDaysUTC } from "@/lib/time-stats";

// Everything the PDF report shows, gathered from the database.

export const SECTIONS = [
  { key: "open", label: "Unfinished tasks", hint: "Tasks planned in the range that aren't done" },
  { key: "done", label: "Completed work", hint: "Tasks and learning steps finished in the range" },
  { key: "progress", label: "Progress", hint: "Overall progress bar of each project and learning path" },
  { key: "time", label: "Time spent", hint: "Time logged in the range" },
  { key: "notes", label: "Notes", hint: "Description and notes of each project and learning path" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export type ReportOptions = {
  from: Date; // first day (midnight UTC)
  to: Date; // last day, included
  projectIds: string[];
  pathIds: string[];
  includeUnlinked: boolean;
  sections: Set<SectionKey>;
};

export type ReportTask = {
  title: string;
  date: Date;
  status: TaskStatus;
  priority: Priority;
  estimateMinutes: number | null;
  completedAt: Date | null;
};

export type ReportItem = {
  kind: "project" | "path";
  name: string;
  color: string;
  status: ProjectStatus;
  description: string | null;
  notes: string | null;
  dueDate: Date | null;
  progress: { done: number; total: number; unit: "tasks" | "steps" };
  openTasks: ReportTask[];
  doneTasks: ReportTask[];
  doneSteps: { title: string; doneAt: Date }[];
  nextStep: string | null;
  minutes: number;
};

export type Report = {
  options: ReportOptions;
  generatedAt: Date;
  userName: string;
  summary: { tasksPlanned: number; tasksDone: number; stepsDone: number; minutes: number };
  items: ReportItem[];
  unlinked: { openTasks: ReportTask[]; doneTasks: ReportTask[]; minutes: number } | null;
};

const taskSelect = { title: true, date: true, status: true, priority: true, estimateMinutes: true, completedAt: true } as const;

export async function buildReport(options: ReportOptions, userName: string): Promise<Report> {
  const { from, to, projectIds, pathIds, includeUnlinked } = options;
  const endDay = addDaysUTC(to, 1); // exclusive
  // "Finished in the range" uses the server's local calendar days.
  const startAt = new Date(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const endAt = new Date(endDay.getUTCFullYear(), endDay.getUTCMonth(), endDay.getUTCDate());

  const [projects, paths] = await Promise.all([
    db.project.findMany({ where: { id: { in: projectIds } }, orderBy: { name: "asc" } }),
    db.learningPath.findMany({
      where: { id: { in: pathIds } },
      orderBy: { title: "asc" },
      include: { steps: { orderBy: { order: "asc" } } },
    }),
  ]);

  const items: ReportItem[] = [];

  for (const p of projects) {
    const [all, done, open, doneTasks, time] = await Promise.all([
      db.task.count({ where: { projectId: p.id } }),
      db.task.count({ where: { projectId: p.id, status: "DONE" } }),
      db.task.findMany({
        where: { projectId: p.id, date: { gte: from, lt: endDay }, status: { not: "DONE" } },
        select: taskSelect,
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
      db.task.findMany({
        where: { projectId: p.id, status: "DONE", completedAt: { gte: startAt, lt: endAt } },
        select: taskSelect,
        orderBy: { completedAt: "asc" },
      }),
      db.timeLog.aggregate({ where: { projectId: p.id, date: { gte: from, lt: endDay } }, _sum: { minutes: true } }),
    ]);
    items.push({
      kind: "project",
      name: p.name,
      color: p.color,
      status: p.status,
      description: p.description,
      notes: p.notes,
      dueDate: p.dueDate,
      progress: { done, total: all, unit: "tasks" },
      openTasks: open,
      doneTasks,
      doneSteps: [],
      nextStep: null,
      minutes: time._sum.minutes ?? 0,
    });
  }

  for (const l of paths) {
    const [open, doneTasks, time] = await Promise.all([
      db.task.findMany({
        where: { learningPathId: l.id, date: { gte: from, lt: endDay }, status: { not: "DONE" } },
        select: taskSelect,
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
      db.task.findMany({
        where: { learningPathId: l.id, status: "DONE", completedAt: { gte: startAt, lt: endAt } },
        select: taskSelect,
        orderBy: { completedAt: "asc" },
      }),
      db.timeLog.aggregate({ where: { learningPathId: l.id, date: { gte: from, lt: endDay } }, _sum: { minutes: true } }),
    ]);
    items.push({
      kind: "path",
      name: l.title,
      color: l.color,
      status: l.status,
      description: l.description,
      notes: l.notes,
      dueDate: null,
      progress: { done: l.steps.filter((s) => s.done).length, total: l.steps.length, unit: "steps" },
      openTasks: open,
      doneTasks,
      doneSteps: l.steps
        .filter((s) => s.done && s.doneAt && s.doneAt >= startAt && s.doneAt < endAt)
        .map((s) => ({ title: s.title, doneAt: s.doneAt! }))
        .sort((a, b) => a.doneAt.getTime() - b.doneAt.getTime()),
      nextStep: l.steps.find((s) => !s.done)?.title ?? null,
      minutes: time._sum.minutes ?? 0,
    });
  }

  let unlinked: Report["unlinked"] = null;
  if (includeUnlinked) {
    const none = { projectId: null, learningPathId: null };
    const [open, doneTasks, time] = await Promise.all([
      db.task.findMany({
        where: { ...none, date: { gte: from, lt: endDay }, status: { not: "DONE" } },
        select: taskSelect,
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
      db.task.findMany({
        where: { ...none, status: "DONE", completedAt: { gte: startAt, lt: endAt } },
        select: taskSelect,
        orderBy: { completedAt: "asc" },
      }),
      db.timeLog.aggregate({ where: { ...none, date: { gte: from, lt: endDay } }, _sum: { minutes: true } }),
    ]);
    unlinked = { openTasks: open, doneTasks, minutes: time._sum.minutes ?? 0 };
  }

  // Summary covers only what's included in the report.
  const groups = [...items, ...(unlinked ? [unlinked] : [])];
  const tasksDone = groups.reduce((s, g) => s + g.doneTasks.length, 0);
  const summary = {
    tasksDone,
    tasksPlanned: tasksDone + groups.reduce((s, g) => s + g.openTasks.length, 0),
    stepsDone: items.reduce((s, i) => s + i.doneSteps.length, 0),
    minutes: groups.reduce((s, g) => s + g.minutes, 0),
  };

  return { options, generatedAt: new Date(), userName, summary, items, unlinked };
}
