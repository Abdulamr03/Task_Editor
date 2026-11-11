import type { Difficulty, Priority, RecurrenceRule, TaskStatus } from "@prisma/client";

// Labels and helpers for tasks. Safe to use in the browser (no database code).

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: "bg-red-500/10 text-red-700 dark:text-red-300",
  MEDIUM: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  LOW: "bg-slate-500/5 text-slate-500 dark:text-slate-400",
};

export const RULES: { value: RecurrenceRule; label: string }[] = [
  { value: "DAILY", label: "Every day" },
  { value: "WEEKDAYS", label: "Weekdays (Mon–Fri)" },
];

export function isPriority(v: string): v is Priority {
  return PRIORITIES.some((p) => p.value === v);
}

export function isRule(v: string): v is RecurrenceRule {
  return RULES.some((r) => r.value === v);
}

export function isTaskStatus(v: string): v is TaskStatus {
  return v === "TODO" || v === "IN_PROGRESS" || v === "DONE";
}

// 90 -> "1h 30m"
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

// What a task can be linked to, as one <select> value: "project:<id>" or "path:<id>".
export type LinkOption = { value: string; label: string; color: string };
export type LinkGroups = { projects: LinkOption[]; paths: LinkOption[] };

export function linkValue(projectId: string | null, learningPathId: string | null): string {
  if (projectId) return `project:${projectId}`;
  if (learningPathId) return `path:${learningPathId}`;
  return "";
}

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

// Short label with dots, readable without colour.
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "●○○ Easy",
  MEDIUM: "●●○ Medium",
  HARD: "●●● Hard",
};

export function isDifficulty(v: string): v is Difficulty {
  return v === "EASY" || v === "MEDIUM" || v === "HARD";
}
