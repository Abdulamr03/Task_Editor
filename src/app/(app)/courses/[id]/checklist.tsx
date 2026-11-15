"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { buttonClass, inputClass } from "@/components/ui";
import { contentToText, courseProgress } from "@/lib/courses";
import { deleteCourse, saveCourseContent, toggleCourseItem } from "../actions";

type Item = { id: string; title: string; heading: boolean; done: boolean };

// The course content as a checklist, with a progress bar that moves as you tick.
export function CourseChecklist({ courseId, items, isAdmin, completed }: { courseId: string; items: Item[]; isAdmin: boolean; completed: boolean }) {
  const [pending, startTransition] = useTransition();
  const [shown, setDone] = useOptimistic(items, (cur, change: { id: string; done: boolean }) =>
    cur.map((i) => (i.id === change.id ? { ...i, done: change.done } : i)),
  );
  const [editing, setEditing] = useState(items.length === 0 && isAdmin);
  const [text, setText] = useState(contentToText(items));
  const [error, setError] = useState("");
  const [earned, setEarned] = useState<string[]>([]);
  const progress = courseProgress(shown);
  const color = progress.total > 0 && progress.done === progress.total ? "#10b981" : "#0ea5e9";

  // Lessons per section, for "3 / 5" next to each heading.
  const sections = new Map<string, { done: number; total: number }>();
  let current = "";
  for (const i of shown) {
    if (i.heading) current = i.id;
    else if (current) {
      const s = sections.get(current) ?? { done: 0, total: 0 };
      s.total++;
      if (i.done) s.done++;
      sections.set(current, s);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium">
            {progress.total === 0 ? "No lessons yet" : `${progress.done} of ${progress.total} lessons done`}
          </span>
          <span className="tabular-nums text-slate-500">{progress.percent}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-label="Course progress" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress.percent}%`, backgroundColor: color }} />
        </div>
      </div>

      {(earned.length > 0 || (completed && progress.total > 0 && progress.done === progress.total)) && (
        <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">🏆 Course complete!</p>
          <p className="text-emerald-900 dark:text-emerald-100">
            {earned.length > 0 ? `Achievement${earned.length > 1 ? "s" : ""} earned: ${earned.join(", ")}. ` : ""}
            Linked learning levels are ticked.{" "}
            <Link href="/achievements" className="font-medium underline">
              See your achievements →
            </Link>
          </p>
        </div>
      )}

      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Course content
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              className={`${inputClass} font-mono text-sm`}
              placeholder={"One lesson per line. Start a line with # for a section, e.g.\n# Section 1: Python basics\nInstalling Python\nVariables and types"}
            />
          </label>
          <p className="text-xs text-slate-500">
            One lesson per line · <span className="font-mono"># Section</span> for a section · <span className="font-mono">[x]</span> in front marks a lesson done.
            Lessons you keep (same name) keep their ticks. Tip: copy the curriculum from the course page.
          </p>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              className={buttonClass.primary}
              onClick={() =>
                startTransition(async () => {
                  const r = await saveCourseContent(courseId, text);
                  if (r.error) setError(r.error);
                  else {
                    setError("");
                    setEditing(false);
                    if (r.earned?.length) setEarned(r.earned);
                  }
                })
              }
            >
              {pending ? "Saving…" : "Save content"}
            </button>
            {items.length > 0 && (
              <button type="button" className={buttonClass.secondary} onClick={() => { setText(contentToText(items)); setEditing(false); }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-500">No content yet.</p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((i, n) =>
            i.heading ? (
              <li key={i.id} className={`flex items-baseline justify-between gap-2 pb-1 ${n > 0 ? "mt-4" : ""}`}>
                <h3 className="font-semibold">{i.title}</h3>
                {sections.get(i.id) && (
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {sections.get(i.id)!.done} / {sections.get(i.id)!.total}
                  </span>
                )}
              </li>
            ) : (
              <li key={i.id}>
                <label className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${isAdmin ? "" : "cursor-default"}`}>
                  <input
                    type="checkbox"
                    checked={i.done}
                    disabled={!isAdmin}
                    onChange={(e) => {
                      const done = e.target.checked;
                      startTransition(async () => {
                        setDone({ id: i.id, done });
                        const r = await toggleCourseItem(i.id, done);
                        if (r.earned.length) setEarned(r.earned);
                      });
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
                  />
                  <span className={`text-sm ${i.done ? "text-slate-400 line-through" : ""}`}>{i.title}</span>
                </label>
              </li>
            ),
          )}
        </ul>
      )}

      {isAdmin && !editing && (
        <button type="button" className={`${buttonClass.secondary} self-start`} onClick={() => setEditing(true)}>
          ✎ Edit content
        </button>
      )}
    </div>
  );
}

export function DeleteCourseButton({ courseId, title }: { courseId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass.danger}
      onClick={() => {
        if (confirm(`Delete the course "${title}"?\n\nIts checklist is deleted. Linked learning levels and an earned achievement are kept.`)) {
          startTransition(() => deleteCourse(courseId));
        }
      }}
    >
      Delete
    </button>
  );
}
