"use client";

import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { buttonClass, inputClass } from "@/components/ui";
import Link from "next/link";
import { DIFFICULTIES, DIFFICULTY_LABEL, formatMinutes } from "@/lib/tasks";
import {
  addMilestone,
  addStep,
  deleteMilestone,
  deleteStep,
  moveMilestone,
  moveStep,
  renameMilestone,
  toggleStep,
  updateStep,
  type StepFormState,
} from "../actions";

export type StepItem = {
  id: string;
  title: string;
  done: boolean;
  doneAt: string | null;
  resourceUrl: string | null;
  notes: string | null;
  milestoneId: string | null;
  estimateMinutes: number | null;
  difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  pages: string | null;
  // The earlier step that already covered this one.
  coveredBy: { title: string; pathId: string; pathTitle: string } | null;
};

export type MilestoneItem = { id: string; title: string; description: string | null };

// The steps of a learning path, grouped by milestone. Steps without a
// milestone are listed last ("Other steps"), or alone when there are no milestones.
export function StepList({
  pathId,
  steps,
  milestones,
  isAdmin,
  color,
}: {
  pathId: string;
  steps: StepItem[];
  milestones: MilestoneItem[];
  isAdmin: boolean;
  color: string;
}) {
  const loose = steps.filter((s) => !s.milestoneId || !milestones.some((m) => m.id === s.milestoneId));

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {steps.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600">
            No steps yet.{isAdmin && " Add the first one below — a chapter, a lesson, a video… or group them into milestones."}
          </p>
        ) : (
          <Steps steps={steps} isAdmin={isAdmin} color={color} />
        )}
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <AddStepForm pathId={pathId} />
            <AddMilestoneForm pathId={pathId} />
          </div>
        )}
      </div>
    );
  }

  let number = 0;
  return (
    <div className="flex flex-col gap-5">
      {milestones.map((m, i) => {
        const own = steps.filter((s) => s.milestoneId === m.id);
        const first = number + 1;
        number += own.length;
        return (
          <MilestoneSection
            key={m.id}
            milestone={m}
            index={i}
            count={milestones.length}
            steps={own}
            firstNumber={first}
            pathId={pathId}
            isAdmin={isAdmin}
            color={color}
          />
        );
      })}
      {loose.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-slate-500">Other steps</h3>
          <Steps steps={loose} firstNumber={number + 1} isAdmin={isAdmin} color={color} />
        </section>
      )}
      {isAdmin && <AddMilestoneForm pathId={pathId} />}
    </div>
  );
}

function Steps({ steps, firstNumber = 1, isAdmin, color }: { steps: StepItem[]; firstNumber?: number; isAdmin: boolean; color: string }) {
  return (
    <ol className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
      {steps.map((step, i) => (
        <StepRow key={step.id} step={step} number={firstNumber + i} isFirst={i === 0} isLast={i === steps.length - 1} isAdmin={isAdmin} color={color} />
      ))}
    </ol>
  );
}

function MilestoneSection({
  milestone,
  index,
  count,
  steps,
  firstNumber,
  pathId,
  isAdmin,
  color,
}: {
  milestone: MilestoneItem;
  index: number;
  count: number;
  steps: StepItem[];
  firstNumber: number;
  pathId: string;
  isAdmin: boolean;
  color: string;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(milestone.title);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const done = steps.filter((s) => s.done).length;
  const percent = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const complete = steps.length > 0 && done === steps.length;

  return (
    <section aria-label={`Milestone ${index + 1}: ${milestone.title}`} className={pending ? "opacity-60" : ""}>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className="flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        >
          {complete ? "✓" : index + 1}
        </span>
        {renaming ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const err = await renameMilestone(milestone.id, name);
                if (err) setError(err);
                else setRenaming(false);
              });
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={200} aria-label="Milestone name" className={`${inputClass} py-1`} />
            <button type="submit" className={buttonClass.primary}>
              Save
            </button>
            <button type="button" className={buttonClass.secondary} onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </form>
        ) : (
          // Phones: the name gets its own line; progress and buttons go under it.
          <h3 className="min-w-0 flex-1 basis-[calc(100%-2.75rem)] text-lg font-semibold sm:basis-0">{milestone.title}</h3>
        )}
        {!renaming && (
          <span className="flex items-center gap-2 pl-10 sm:pl-0">
          <span className="text-sm text-slate-500">
            {steps.length ? `${done} of ${steps.length} · ${percent}%` : "No levels yet"}
          </span>
        {isAdmin && (
          <span className="flex">
            <IconButton label="Move milestone up" disabled={index === 0 || pending} onClick={() => startTransition(() => moveMilestone(milestone.id, "up"))}>
              ↑
            </IconButton>
            <IconButton label="Move milestone down" disabled={index === count - 1 || pending} onClick={() => startTransition(() => moveMilestone(milestone.id, "down"))}>
              ↓
            </IconButton>
            <IconButton label="Rename milestone" disabled={pending} onClick={() => setRenaming(true)}>
              ✎
            </IconButton>
            <IconButton
              label="Delete milestone"
              danger
              disabled={pending}
              onClick={() => {
                if (confirm(`Delete milestone "${milestone.title}"?\n\nIts levels are kept and move to "Other steps".`)) {
                  startTransition(() => deleteMilestone(milestone.id));
                }
              }}
            >
              ✕
            </IconButton>
          </span>
        )}
          </span>
        )}
      </div>
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      {milestone.description && <p className="mb-2 text-sm text-slate-500">{milestone.description}</p>}
      {steps.length > 0 && <Steps steps={steps} firstNumber={firstNumber} isAdmin={isAdmin} color={color} />}
      {isAdmin && (
        <div className="mt-2">
          <AddStepForm pathId={pathId} milestoneId={milestone.id} label="+ Add level" />
        </div>
      )}
    </section>
  );
}

function AddMilestoneForm({ pathId }: { pathId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addMilestone.bind(null, pathId), undefined);

  useEffect(() => {
    if (state?.savedAt) setOpen(false);
  }, [state?.savedAt]);

  if (!open) {
    return (
      <button type="button" className={`${buttonClass.secondary} self-start`} onClick={() => setOpen(true)}>
        + Add milestone
      </button>
    );
  }
  return (
    <form action={formAction} className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Milestone name
        <input name="title" required maxLength={200} autoFocus defaultValue={state?.values?.title} placeholder="e.g. Module 2: Convolutional networks" className={inputClass} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : "Add milestone"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass.secondary}>
          Cancel
        </button>
      </div>
    </form>
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
          initial={{ title: step.title, resourceUrl: step.resourceUrl ?? "", notes: step.notes ?? "", difficulty: step.difficulty ?? "" }}
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
        {(step.estimateMinutes || step.pages || step.difficulty) && (
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
            {step.estimateMinutes && <span>⏱ {formatMinutes(step.estimateMinutes)}</span>}
            {step.difficulty && <span>{DIFFICULTY_LABEL[step.difficulty]}</span>}
            {step.pages && <span>📖 {step.pages}</span>}
          </p>
        )}
        {step.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{step.notes}</p>}
        {step.coveredBy && (
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            ✓ Already covered by “{step.coveredBy.title}” in{" "}
            <Link href={`/learning/${step.coveredBy.pathId}`} className="underline hover:no-underline">
              {step.coveredBy.pathTitle}
            </Link>
          </p>
        )}
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

function AddStepForm({ pathId, milestoneId, label = "+ Add step" }: { pathId: string; milestoneId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  if (!open) {
    return (
      <button type="button" className={`${buttonClass.secondary} self-start`} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-3 font-medium">{milestoneId ? "New level" : "New step"}</h3>
      <StepForm
        key={formKey}
        action={addStep.bind(null, pathId)}
        milestoneId={milestoneId}
        initial={{ title: "", resourceUrl: "", notes: "", difficulty: "" }}
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
  milestoneId,
}: {
  milestoneId?: string;
  action: (state: StepFormState, formData: FormData) => Promise<StepFormState>;
  initial: { title: string; resourceUrl: string; notes: string; difficulty: string };
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
    <form action={formAction} className="flex w-full flex-col gap-3" key={JSON.stringify(state?.values ?? {})}>
      {milestoneId && <input type="hidden" name="milestoneId" value={milestoneId} />}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input name="title" defaultValue={v.title} required maxLength={200} autoFocus={autoFocus} className={inputClass} placeholder="e.g. Chapter 3: Graph convolutions" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Link <span className="text-xs font-normal text-slate-500">(optional) course page, video, PDF…</span>
        <input name="resourceUrl" defaultValue={v.resourceUrl} inputMode="url" className={inputClass} placeholder="https://" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Difficulty <span className="text-xs font-normal text-slate-500">(optional — helps “Plan my day”)</span>
        <select name="difficulty" defaultValue={v.difficulty} className={inputClass}>
          <option value="">— Not set —</option>
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
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
