"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatMinutes, linkValue, type LinkGroups } from "@/lib/tasks";
import { deleteTimeLog, updateTimeLog } from "./actions";
import { TimeForm } from "./time-form";

export type TimeEntry = {
  id: string;
  date: string;
  minutes: number;
  note: string | null;
  project: { id: string; name: string; color: string } | null;
  learningPath: { id: string; title: string; color: string } | null;
};

// The week's entries, one group per day (newest day first).
export function TimeEntries({ entries, isAdmin, links }: { entries: TimeEntry[]; isAdmin: boolean; links: LinkGroups }) {
  const days = [...new Set(entries.map((e) => e.date))].sort().reverse();
  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => {
        const list = entries.filter((e) => e.date === day);
        const total = list.reduce((s, e) => s + e.minutes, 0);
        return (
          <div key={day}>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <h3 className="font-semibold">
                {new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}
              </h3>
              <span className="text-slate-500">{formatMinutes(total)}</span>
            </div>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
              {list.map((e) => (
                <Row key={e.id} entry={e} isAdmin={isAdmin} links={links} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Row({ entry, isAdmin, links }: { entry: TimeEntry; isAdmin: boolean; links: LinkGroups }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const linked = entry.project
    ? { href: `/projects/${entry.project.id}`, label: entry.project.name, color: entry.project.color }
    : entry.learningPath
      ? { href: `/learning/${entry.learningPath.id}`, label: entry.learningPath.title, color: entry.learningPath.color }
      : null;

  if (editing) {
    return (
      <li className="p-4">
        <TimeForm
          action={updateTimeLog.bind(null, entry.id)}
          links={links}
          submitLabel="Save"
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
          initial={{
            date: entry.date,
            duration: formatMinutes(entry.minutes),
            link: linkValue(entry.project?.id ?? null, entry.learningPath?.id ?? null),
            note: entry.note ?? "",
          }}
        />
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-3 p-3 sm:p-4 ${pending ? "opacity-60" : ""}`}>
      <span className="w-16 shrink-0 font-semibold tabular-nums">{formatMinutes(entry.minutes)}</span>
      <div className="min-w-0 flex-1 text-sm">
        {linked ? (
          <Link href={linked.href} className="inline-flex items-center gap-1.5 font-medium hover:underline">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: linked.color }} />
            {linked.label}
          </Link>
        ) : (
          <span className="text-slate-500">Not linked</span>
        )}
        {entry.note && <p className="truncate text-slate-500">{entry.note}</p>}
      </div>
      {isAdmin && (
        <div className="flex shrink-0 gap-1 text-sm">
          <button type="button" aria-label="Edit entry" title="Edit entry" disabled={pending} onClick={() => setEditing(true)} className="h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            ✎
          </button>
          <button
            type="button"
            aria-label="Delete entry"
            title="Delete entry"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete this ${formatMinutes(entry.minutes)} entry?`)) startTransition(() => deleteTimeLog(entry.id));
            }}
            className="h-8 w-8 rounded-md text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
