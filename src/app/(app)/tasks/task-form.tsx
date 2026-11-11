"use client";

import { useActionState, useEffect, useState } from "react";
import { buttonClass, inputClass } from "@/components/ui";
import { DIFFICULTIES, PRIORITIES, RULES, type LinkGroups } from "@/lib/tasks";
import { LinkSelect } from "@/components/link-select";
import type { TaskFormState } from "./actions";

export type TaskFormValues = {
  title: string;
  notes: string;
  date?: string;
  priority: string;
  estimate: string;
  link: string;
  rule?: string;
  difficulty?: string;
};

// One form for adding a task, editing a task and adding a recurring task.
// `date`  — show a date field (editing). `rule` — show "how often" (recurring).
// `compact` — show only the title until "More options" is opened (quick add).
export function TaskForm({
  action,
  initial,
  links,
  submitLabel,
  onSaved,
  onCancel,
  showDate = false,
  showRule = false,
  compact = false,
  hiddenDate,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  initial: TaskFormValues;
  links: LinkGroups;
  submitLabel: string;
  onSaved?: () => void;
  onCancel?: () => void;
  showDate?: boolean;
  showRule?: boolean;
  compact?: boolean;
  hiddenDate?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [more, setMore] = useState(!compact);
  const v = { ...initial, ...state?.values };

  useEffect(() => {
    if (state?.savedAt) onSaved?.();
    // Only react to a new successful save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.savedAt]);

  return (
    <form action={formAction} className="flex flex-col gap-3" key={`${state?.savedAt ?? ""}${JSON.stringify(state?.values ?? {})}`}>
      {hiddenDate && <input type="hidden" name="date" value={hiddenDate} />}
      <div className="flex gap-2">
        <input
          name="title"
          defaultValue={v.title}
          required
          maxLength={200}
          aria-label="Task"
          placeholder={showRule ? "e.g. Review flashcards" : "Add a task…"}
          className={inputClass}
          autoFocus={compact && Boolean(state?.savedAt)}
        />
        {compact && (
          <button type="submit" disabled={pending} className={`${buttonClass.primary} shrink-0`}>
            {pending ? "Adding…" : submitLabel}
          </button>
        )}
      </div>

      {compact && !more && (
        <button type="button" onClick={() => setMore(true)} className="self-start text-sm text-slate-500 hover:underline">
          + Priority, time, project…
        </button>
      )}

      {/* Kept in the page when hidden so their default values are still sent. */}
      <div className={more ? "flex flex-col gap-3" : "hidden"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {showRule && (
            <Field label="Repeats">
              <select name="rule" defaultValue={v.rule} className={inputClass}>
                {RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {showDate && (
            <Field label="Date">
              <input type="date" name="date" defaultValue={v.date} required className={inputClass} />
            </Field>
          )}
          <Field label="Priority">
            <select name="priority" defaultValue={v.priority} className={inputClass}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          {!showRule && (
            <Field label="Difficulty">
              <select name="difficulty" defaultValue={v.difficulty ?? ""} className={inputClass}>
                <option value="">— Not set —</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Time (minutes)">
            <input name="estimate" type="number" min={1} max={1440} step={1} defaultValue={v.estimate} placeholder="e.g. 30" className={inputClass} />
          </Field>
          <Field label="Project / learning path" wide={showDate || showRule}>
            <LinkSelect links={links} defaultValue={v.link} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea name="notes" defaultValue={v.notes} rows={2} className={inputClass} />
        </Field>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      {!compact && (
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? "Saving…" : submitLabel}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className={buttonClass.secondary}>
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}
