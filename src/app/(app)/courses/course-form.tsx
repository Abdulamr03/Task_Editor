"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { buttonClass, inputClass } from "@/components/ui";
import type { LevelChoices } from "@/lib/course-levels";
import type { CourseFormState } from "./actions";

export function CourseForm({
  action,
  initial,
  initialSteps,
  levels,
  courseId,
  showContent,
  cancelHref,
}: {
  action: (state: CourseFormState, formData: FormData) => Promise<CourseFormState>;
  initial: { title: string; url: string; provider: string; notes: string };
  initialSteps: string[];
  levels: LevelChoices;
  // When editing: this course's id (levels linked to it aren't "linked to another course").
  courseId?: string;
  showContent: boolean;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const v = { content: "", ...initial, ...state?.values };
  const [chosen, setChosen] = useState<Set<string>>(new Set(state?.stepIds ?? initialSteps));
  const toggle = (id: string, on: boolean) =>
    setChosen((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <form action={formAction} className="flex flex-col gap-4" key={JSON.stringify(state?.values ?? {})}>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Course name
        <input name="title" defaultValue={v.title} required maxLength={200} autoFocus className={inputClass} placeholder="e.g. The Complete Python Bootcamp" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Link <span className="text-xs font-normal text-slate-500">(the course page you study from)</span>
        <input name="url" defaultValue={v.url} inputMode="url" className={inputClass} placeholder="https://www.udemy.com/course/…" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Platform <span className="text-xs font-normal text-slate-500">(optional — found from the link: Udemy, Coursera, YouTube…)</span>
        <input name="provider" defaultValue={v.provider} maxLength={60} className={inputClass} />
      </label>
      {showContent && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Course content <span className="text-xs font-normal text-slate-500">(optional — you can add it later)</span>
          <textarea
            name="content"
            defaultValue={v.content}
            rows={10}
            className={`${inputClass} font-mono text-sm`}
            placeholder={"One lesson per line. Start a line with # for a section, e.g.\n# Section 1: Python basics\nInstalling Python\nVariables and types\n# Section 2: Functions\nDefining functions"}
          />
          <span className="text-xs font-normal text-slate-500">
            Tip: copy the curriculum from the course page and paste it here, then tidy it up.
          </span>
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes <span className="text-xs font-normal text-slate-500">(optional)</span>
        <textarea name="notes" defaultValue={v.notes} rows={2} className={inputClass} />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          Learning levels this course covers{" "}
          <span className="text-xs font-normal text-slate-500">
            ({chosen.size} chosen — they&apos;re ticked automatically when you finish the course)
          </span>
        </legend>
        {levels.length === 0 ? (
          <p className="text-sm text-slate-500">
            No learning levels yet. <Link href="/learning" className="text-blue-600 underline dark:text-blue-400">Create a learning path</Link> first, or link levels later.
          </p>
        ) : (
          levels.map((p) => {
            const count = p.steps.filter((s) => chosen.has(s.id)).length;
            return (
              <details key={p.id} open={count > 0} className="rounded-lg border border-slate-200 dark:border-slate-700">
                <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.title} {count > 0 && <span className="font-normal text-slate-500">· {count} chosen</span>}
                </summary>
                <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto px-3 pb-3">
                  {p.steps.map((s) => (
                    <li key={s.id}>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="stepIds"
                          value={s.id}
                          checked={chosen.has(s.id)}
                          onChange={(e) => toggle(s.id, e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span className={s.done ? "text-slate-400" : ""}>
                          {s.milestone && <span className="text-slate-500">{s.milestone} · </span>}
                          {s.title}
                          {s.done && " ✓"}
                          {s.courseId && s.courseId !== courseId && (
                            <span className="text-xs text-amber-700 dark:text-amber-400"> (now linked to “{s.courseTitle}”; choosing it moves it here)</span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })
        )}
      </fieldset>

      {state?.error && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : showContent ? "Add course" : "Save course"}
        </button>
        <Link href={cancelHref} className={buttonClass.secondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
