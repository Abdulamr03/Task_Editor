import { daysUntil, formatDate } from "@/lib/dates";

// How close a due date is: "10 days overdue" (red), "in 3 days" (amber)...
export function dueNote(date: Date, done: boolean): { note: string; tone: string } {
  const days = daysUntil(date);
  if (done || days > 7) return { note: "", tone: "text-slate-500" };
  if (days < 0) return { note: `${-days} day${days === -1 ? "" : "s"} overdue`, tone: "text-red-600 dark:text-red-400" };
  if (days === 0) return { note: "today", tone: "text-amber-600 dark:text-amber-400" };
  return { note: `in ${days} day${days === 1 ? "" : "s"}`, tone: "text-amber-600 dark:text-amber-400" };
}

// "Due 3 Dec 2026 · in 4 days"
export function DueLabel({ date, done }: { date: Date; done: boolean }) {
  const { note, tone } = dueNote(date, done);
  return (
    <p className={`text-sm ${tone}`}>
      Due {formatDate(date)}
      {note && ` · ${note}`}
    </p>
  );
}
