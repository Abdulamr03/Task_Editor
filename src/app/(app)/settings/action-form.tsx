"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import type { SettingsState } from "./actions";

// A settings form that shows "Saved." or an error under it. Unlike a plain
// form action, it keeps what was typed when there's an error.
export function ActionForm({
  action,
  submitLabel,
  children,
  resetOnSuccess = false,
  danger = false,
  confirmText,
}: {
  action: (state: SettingsState, fd: FormData) => Promise<SettingsState>;
  submitLabel: string;
  children: React.ReactNode;
  resetOnSuccess?: boolean;
  danger?: boolean;
  confirmText?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmText && !confirm(confirmText)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          formAction(fd);
        });
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && !pending && (
        <SuccessNote key={state.at} text={state.success} onShow={() => resetOnSuccess && form.current?.reset()} />
      )}
      <div>
        <button type="submit" disabled={pending} className={danger ? buttonClass.danger : buttonClass.primary}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function SuccessNote({ text, onShow }: { text: string; onShow: () => void }) {
  // Clear the form once, when this message first appears.
  useEffect(() => {
    onShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <p role="status" className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
      {text}
    </p>
  );
}
