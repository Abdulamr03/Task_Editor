"use client";

import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { buttonClass, inputClass } from "@/components/ui";
import { addStep, deleteStep, moveStep, toggleStep, updateStep, type StepFormState } from "../actions";

export type StepItem = {
  id: string;
  title: string;
  done: boolean;
  doneAt: string | null;
  resourceUrl: string | null;
  notes: string | null;
};

// The checklist of steps on a learning path's page.
export function StepList({ pathId, steps, isAdmin, color }: { pathId: string; steps: StepItem[]; isAdmin: boolean; color: string }) {
  return (
    <div className="flex flex-col gap-3">
      {steps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600">
          No steps yet.{isAdmin && " Add the first one below — a chapter, a lesson, a video…"}
        </p>
      ) : (
        <ol className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
          {steps.map((step, i) => (
            <StepRow key={step.id} step={step} number={i + 1} isFirst={i === 0} isLast={i === steps.length - 1} isAdmin={isAdmin} color={color} />
          ))}
        </ol>
      )}
      {isAdmin && <AddStepForm pathId={pathId} />}
    </div>
  );
}

function StepRow({
  step,
  number,
  isFirst,
  isLast,
  isAdmin,
  color,
}: {
  step: StepItem;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  isAdmin: boolean;
  color: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  // Tick the box straight away; the server catches up a moment later.
  const [done, setOptimisticDone] = useOptimistic(step.done);

  if (editing) {
    return (
      <li className="p-4">
        <StepForm
          action={updateStep.bind(null, step.id)}
          initial={{ title: step.title, resourceUrl: step.resourceUrl ?? "", notes: step.notes ?? "" }}
          submitLabel="Save step"
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className={`flex items-start gap-3 p-4 ${pending ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        checked={done}
        disabled={!isAdmin}
        aria-label={`Mark step ${number} "${step.title}" as ${done ? "not done" : "done"}`}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setOptimisticDone(next);
            await toggleStep(step.id, next);
          });
        }}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer disabled:cursor-default"
        style={{ accentColor: color }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? "text-slate-400 line-through" : ""}`}>
          <span className="mr-2 text-sm text-slate-400">{number}.</span>
          {step.title}
        </p>
        {step.resourceUrl && (
          <a
            href={step.resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-block max-w-full truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {prettyUrl(step.resourceUrl)} ↗
          </a>
        )}
        {step.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{step.notes}</p>}
        {done && step.doneAt && <p className="mt-1 text-xs text-slate-400">Done {formatDoneDate(step.doneAt)}</p>}
      </div>
      {isAdmin && (
        <div className="-ml-2 flex shrink-0 items-center gap-1 text-sm sm:ml-0">
          <IconButton label="Move up" disabled={isFirst || pending} onClick={() => startTransition(() => moveStep(step.id, "up"))}>
            ↑
          </IconButton>
          <IconButton label="Move down" disabled={isLast || pending} onClick={() => startTransition(() => moveStep(step.id, "down"))}>
            ↓
          </IconButton>
          <IconButton label="Edit step" disabled={pending} onClick={() => setEditing(true)}>
            ✎
          </IconButton>
          <IconButton
            label="Delete step"
            disabled={pending}
            danger
            onClick={() => {
              if (confirm(`Delete step "${step.title}"?`)) startTransition(() => deleteStep(step.id));
            }}
          >
            ✕
          </IconButton>
        </div>
      )}
      </div>
    </li>
  );
}

function AddStepForm({ pathId }: { pathId: string }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  if (!open) {
    return (
      <button type="button" className={`${buttonClass.secondary} self-start`} onClick={() => setOpen(true)}>
        + Add step
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-3 font-medium">New step</h3>
      <StepForm
        key={formKey}
        action={addStep.bind(null, pathId)}
        initial={{ title: "", resourceUrl: "", notes: "" }}
        submitLabel="Add step"
        // Stay open with an empty form, ready for the next step.
        onSaved={() => setFormKey((k) => k + 1)}
        onCancel={() => setOpen(false)}
        autoFocus
      />
    </div>
  );
}

function StepForm({
  action,
  initial,
  submitLabel,
  onSaved,
  onCancel,
  autoFocus = false,
}: {
  action: (state: StepFormState, formData: FormData) => Promise<StepFormState>;
  initial: { title: string; resourceUrl: string; notes: string };
  submitLabel: string;
  onSaved: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const v = { ...initial, ...state?.values };

  useEffect(() => {
    if (state?.savedAt) onSaved();
    // Only react to a new successful save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.savedAt]);

  return (
    <form action={formAction} className="flex flex-col gap-3" key={JSON.stringify(state?.values ?? {})}>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input name="title" defaultValue={v.title} required maxLength={200} autoFocus={autoFocus} className={inputClass} placeholder="e.g. Chapter 3: Graph convolutions" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Link <span className="text-xs font-normal text-slate-500">(optional) course page, video, PDF…</span>
        <input name="resourceUrl" defaultValue={v.resourceUrl} inputMode="url" className={inputClass} placeholder="https://" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes <span className="text-xs font-normal text-slate-500">(optional)</span>
        <textarea name="notes" defaultValue={v.notes} rows={2} className={inputClass} />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={buttonClass.secondary}>
          {submitLabel === "Add step" ? "Done" : "Cancel"}
        </button>
      </div>
    </form>
  );
}

function IconButton({
  label,
  disabled,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-30 ${
        danger ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
  } catch {
    return url;
  }
}

function formatDoneDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
