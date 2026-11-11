"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import type { Difficulty, Priority, TaskStatus } from "@prisma/client";
import { DIFFICULTY_LABEL, formatMinutes, linkValue, PRIORITY_STYLES, type LinkGroups } from "@/lib/tasks";
import { toHHMM } from "@/lib/planner/time";
import { deleteTask, moveTask, setTaskStatus, updateTask } from "./actions";
import { TaskForm } from "./task-form";

export type TaskItem = {
  id: string;
  title: string;
  notes: string | null;
  date: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: Priority;
  estimateMinutes: number | null;
  difficulty: Difficulty | null;
  plannedStart: number | null;
  recurring: boolean;
  project: { id: string; name: string; color: string } | null;
  learningPath: { id: string; title: string; color: string } | null;
};

export function TaskList({
  tasks,
  isAdmin,
  links,
  todayDate,
  showDate = false,
}: {
  tasks: TaskItem[];
  isAdmin: boolean;
  links: LinkGroups;
  todayDate: string;
  showDate?: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} isAdmin={isAdmin} links={links} todayDate={todayDate} showDate={showDate} />
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  isAdmin,
  links,
  todayDate,
  showDate,
}: {
  task: TaskItem;
  isAdmin: boolean;
  links: LinkGroups;
  todayDate: string;
  showDate: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setOptimisticStatus] = useOptimistic(task.status);
  const done = status === "DONE";
  const overdue = !done && task.date < todayDate;

  const change = (next: TaskStatus) =>
    startTransition(async () => {
      setOptimisticStatus(next);
      await setTaskStatus(task.id, next);
    });

  if (editing) {
    return (
      <li className="p-4">
        <TaskForm
          action={updateTask.bind(null, task.id)}
          links={links}
          showDate
          submitLabel="Save task"
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
          initial={{
            title: task.title,
            notes: task.notes ?? "",
            date: task.date,
            priority: task.priority,
            estimate: task.estimateMinutes ? String(task.estimateMinutes) : "",
            link: linkValue(task.project?.id ?? null, task.learningPath?.id ?? null),
            difficulty: task.difficulty ?? "",
          }}
        />
      </li>
    );
  }

  const linked = task.project
    ? { href: `/projects/${task.project.id}`, label: task.project.name, color: task.project.color }
    : task.learningPath
      ? { href: `/learning/${task.learningPath.id}`, label: task.learningPath.title, color: task.learningPath.color }
      : null;

  return (
    <li className={`flex items-start gap-3 p-4 ${pending ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        checked={done}
        disabled={!isAdmin}
        aria-label={`Mark "${task.title}" as ${done ? "not done" : "done"}`}
        onChange={(e) => change(e.target.checked ? "DONE" : "TODO")}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-blue-600 disabled:cursor-default"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${done ? "text-slate-400 line-through" : ""}`}>
            {task.plannedStart != null && <span className="mr-2 text-sm tabular-nums text-blue-600 dark:text-blue-400">{toHHMM(task.plannedStart)}</span>}
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {status === "IN_PROGRESS" && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-300">In progress</span>}
            {task.priority !== "MEDIUM" && (
              <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLES[task.priority]}`}>
                {task.priority === "HIGH" ? "High priority" : "Low priority"}
              </span>
            )}
            {task.estimateMinutes && <span>⏱ {formatMinutes(task.estimateMinutes)}</span>}
            {task.difficulty && <span>{DIFFICULTY_LABEL[task.difficulty]}</span>}
            {linked && (
              <Link href={linked.href} className="inline-flex items-center gap-1 hover:underline">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: linked.color }} />
                {linked.label}
              </Link>
            )}
            {task.recurring && <span title="Recurring task">↻ Repeats</span>}
            {(showDate || overdue) && (
              <span className={overdue ? "text-red-600 dark:text-red-400" : ""}>{formatDay(task.date)}</span>
            )}
          </div>
          {task.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{task.notes}</p>}
        </div>

        {isAdmin && (
          <div className="-ml-2 flex shrink-0 flex-wrap items-center gap-1 text-sm sm:ml-0">
            {overdue ? (
              <SmallButton onClick={() => startTransition(() => moveTask(task.id, todayDate))} disabled={pending}>
                Move to today
              </SmallButton>
            ) : (
              !done && (
                <SmallButton onClick={() => change(status === "IN_PROGRESS" ? "TODO" : "IN_PROGRESS")} disabled={pending}>
                  {status === "IN_PROGRESS" ? "Pause" : "Start"}
                </SmallButton>
              )
            )}
            {!done && !overdue && (
              <SmallButton onClick={() => startTransition(() => moveTask(task.id, addDays(task.date, 1)))} disabled={pending} title="Move to the next day">
                Tomorrow →
              </SmallButton>
            )}
            <SmallButton onClick={() => setEditing(true)} disabled={pending} title="Edit task" aria-label="Edit task">
              ✎
            </SmallButton>
            <SmallButton
              danger
              disabled={pending}
              title="Delete task"
              aria-label="Delete task"
              onClick={() => {
                if (confirm(`Delete "${task.title}"?`)) startTransition(() => deleteTask(task.id));
              }}
            >
              ✕
            </SmallButton>
          </div>
        )}
      </div>
    </li>
  );
}

function SmallButton({
  danger = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`h-8 whitespace-nowrap rounded-md px-2 disabled:opacity-30 ${
        danger ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

// "YYYY-MM-DD" + n days, without time-zone shifts.
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
