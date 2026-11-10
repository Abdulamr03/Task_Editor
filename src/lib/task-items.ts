import type { Prisma } from "@prisma/client";
import { toDateInput } from "@/lib/dates";
import type { TaskItem } from "@/app/(app)/tasks/task-list";

// What to load with a task so the task list can show it.
export const taskInclude = {
  project: { select: { id: true, name: true, color: true } },
  learningPath: { select: { id: true, title: true, color: true } },
} satisfies Prisma.TaskInclude;

type TaskWithLinks = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

const STATUS_ORDER = { IN_PROGRESS: 0, TODO: 1, DONE: 2 } as const;
const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

// In progress first, then to do, then done; high priority first within each.
export function sortTasks<T extends TaskWithLinks>(tasks: T[]): T[] {
  return [...tasks].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

// Plain data for the browser (dates as text).
export function toTaskItem(t: TaskWithLinks): TaskItem {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    date: toDateInput(t.date),
    status: t.status,
    priority: t.priority,
    estimateMinutes: t.estimateMinutes,
    recurring: t.recurringTaskId !== null,
    project: t.project,
    learningPath: t.learningPath,
  };
}
