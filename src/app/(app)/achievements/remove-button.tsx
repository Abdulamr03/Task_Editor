"use client";

import { useTransition } from "react";
import { deleteAchievement } from "../courses/actions";

export function RemoveAchievementButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      title="Remove achievement"
      aria-label={`Remove achievement "${title}"`}
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove the achievement "${title}"?`)) startTransition(() => deleteAchievement(id));
      }}
      className="h-7 w-7 shrink-0 rounded-md text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-600"
    >
      ✕
    </button>
  );
}
