"use client";

import { useTransition } from "react";
import { formatMinutes, PRIORITY_STYLES, RULES } from "@/lib/tasks";
import type { Priority, RecurrenceRule } from "@prisma/client";
import { deleteRecurring, setRecurringActive } from "../actions";

export type RecurringItem = {
  id: string;
  title: string;
  rule: RecurrenceRule;
  priority: Priority;
  estimateMinutes: number | null;
  active: boolean;
  linkLabel: string | null;
  linkColor: string | null;
};

export function RecurringList({ items, isAdmin }: { items: RecurringItem[]; isAdmin: boolean }) {
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
      {items.map((r) => (
        <Row key={r.id} item={r} isAdmin={isAdmin} />
      ))}
    </ul>
  );
}

function Row({ item, isAdmin }: { item: RecurringItem; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${item.active ? "" : "text-slate-400"}`}>
          ↻ {item.title}
          {!item.active && <span className="ml-2 text-xs font-normal">(paused)</span>}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{RULES.find((x) => x.value === item.rule)?.label}</span>
          {item.priority !== "MEDIUM" && (
            <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLES[item.priority]}`}>
              {item.priority === "HIGH" ? "High priority" : "Low priority"}
            </span>
          )}
          {item.estimateMinutes && <span>⏱ {formatMinutes(item.estimateMinutes)}</span>}
          {item.linkLabel && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.linkColor ?? undefined }} />
              {item.linkLabel}
            </span>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="-ml-2 flex gap-1 text-sm sm:ml-0">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => setRecurringActive(item.id, !item.active))}
            className="h-8 rounded-md px-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {item.active ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            disabled={pending}
            aria-label="Delete recurring task"
            title="Delete recurring task"
            onClick={() => {
              if (confirm(`Stop repeating "${item.title}" and delete it?\n\nTasks it already added are kept.`)) {
                startTransition(() => deleteRecurring(item.id));
              }
            }}
            className="h-8 rounded-md px-2 text-red-600 hover:bg-red-500/10 disabled:opacity-30 dark:text-red-400"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
