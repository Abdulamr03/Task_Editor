import type { ProjectStatus } from "@prisma/client";

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "DONE", label: "Done" },
  { value: "ARCHIVED", label: "Archived" },
];

export const STATUS_STYLES: Record<ProjectStatus, string> = {
  ACTIVE: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  PAUSED: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  DONE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ARCHIVED: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export function statusLabel(status: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUSES.some((s) => s.value === value);
}

// Labels, colours and checks for projects. Safe to use in the browser
// (no database code here; see project-progress.ts for that).

// Colours offered when creating a project.
export const PROJECT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];
