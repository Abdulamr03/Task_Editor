"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass, buttonClass } from "@/components/ui";
import { PROJECT_COLORS, PROJECT_STATUSES } from "@/lib/projects";
import type { ProjectFormState } from "./actions";

export type ProjectFormValues = {
  name: string;
  description: string;
  status: string;
  color: string;
  startDate: string;
  dueDate: string;
  notes: string;
};

export function ProjectForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  initial: ProjectFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // After an error, show what was typed; otherwise the saved values.
  const v = { ...initial, ...state?.values } as ProjectFormValues;
  const colors = PROJECT_COLORS.includes(v.color) ? PROJECT_COLORS : [...PROJECT_COLORS, v.color];

  return (
    <form action={formAction} className="flex flex-col gap-5" key={JSON.stringify(state?.values ?? {})}>
      <Field label="Name">
        <input name="name" defaultValue={v.name} required maxLength={100} className={inputClass} />
      </Field>

      <Field label="Description" hint="One or two lines about the project.">
        <textarea name="description" defaultValue={v.description} rows={2} className={inputClass} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Status">
          <select name="status" defaultValue={v.status} className={inputClass}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start date">
          <input type="date" name="startDate" defaultValue={v.startDate} className={inputClass} />
        </Field>
        <Field label="Due date">
          <input type="date" name="dueDate" defaultValue={v.dueDate} className={inputClass} />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={c === v.color} className="peer sr-only" />
              <span
                className="block h-8 w-8 rounded-full ring-offset-2 ring-offset-white peer-checked:ring-2 peer-checked:ring-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 dark:ring-offset-slate-900 dark:peer-checked:ring-slate-100"
                style={{ backgroundColor: c }}
                title={c}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Notes" hint="Anything to remember: ideas, links, decisions.">
        <textarea name="notes" defaultValue={v.notes} rows={5} className={inputClass} />
      </Field>

      {state?.error && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className={buttonClass.secondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}
