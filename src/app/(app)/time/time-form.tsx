"use client";

import { useActionState, useEffect, useRef } from "react";
import { buttonClass, inputClass } from "@/components/ui";
import { LinkSelect } from "@/components/link-select";
import type { LinkGroups } from "@/lib/tasks";
import type { TimeFormState } from "./actions";

export type TimeFormValues = { date: string; duration: string; link: string; note: string };

const QUICK = ["15m", "30m", "45m", "1h", "1h 30m", "2h"];

// Form for logging time, and for editing an entry.
export function TimeForm({
  action,
  initial,
  links,
  submitLabel,
  onSaved,
  onCancel,
}: {
  action: (state: TimeFormState, formData: FormData) => Promise<TimeFormState>;
  initial: TimeFormValues;
  links: LinkGroups;
  submitLabel: string;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const duration = useRef<HTMLInputElement>(null);
  const lastSaved = useRef<Partial<TimeFormValues>>({});
  // After a new entry, keep the date and project so the next one is quick.
  const v = state?.savedAt && !onCancel ? { ...initial, ...lastSaved.current } : { ...initial, ...state?.values };

  useEffect(() => {
    if (state?.savedAt) onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.savedAt]);

  return (
    <form
      action={(fd) => {
        lastSaved.current = { date: String(fd.get("date")), link: String(fd.get("link")) };
        return formAction(fd);
      }}
      className="flex flex-col gap-3"
      key={`${state?.savedAt ?? ""}${JSON.stringify(state?.values ?? {})}`}
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr]">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Date
          <input type="date" name="date" defaultValue={v.date} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Time spent
          <input
            ref={duration}
            name="duration"
            defaultValue={v.duration}
            required
            placeholder="e.g. 45, 1h 30m or 1:30"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Project / learning path
          <LinkSelect links={links} defaultValue={v.link} />
        </label>
      </div>
      <div className="flex flex-wrap gap-1" aria-label="Quick times">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              if (duration.current) duration.current.value = q;
            }}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            {q}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Note (optional)
        <input name="note" defaultValue={v.note} maxLength={500} placeholder="What did you work on?" className={inputClass} />
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
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass.secondary}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
